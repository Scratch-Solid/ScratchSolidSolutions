export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getIntakeRequest } from '@/lib/db';
import { logger } from '@/lib/logger';
import { processWebhookEvent, verifyWebhookSignature } from '@/lib/paystack';
import { sendBookingConfirmationEmail, sendDigitalDepositConfirmationEmail, sendDigitalDepositAdminAlertEmail, sendDigitalFinalPaymentConfirmationEmail } from '@/lib/email';

// Paystack webhook - moved here from backend-worker, which processed these
// against its own separate, always-empty database (see lib/paystack.ts
// header comment). No auth - verified by HMAC signature instead, same as
// backend-worker's version did.
//
// NOTE: the Paystack dashboard's webhook URL must be updated to point here
// (https://scratchsolidsolutions.org/api/webhooks/paystack) instead of the
// old backend-worker URL - that's an external config change, not code.
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-paystack-signature') || '';
    const bodyText = await request.text();

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      logger.error('Paystack webhook received but PAYSTACK_SECRET_KEY not configured', new Error('missing secret'));
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    const isValid = await verifyWebhookSignature(secretKey, signature, bodyText);
    if (!isValid) {
      logger.error('Paystack webhook signature invalid', new Error('invalid signature'));
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const body = JSON.parse(bodyText);
    const event = processWebhookEvent(body);

    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    // Refunds
    if (event.event === 'refund.processed' && event.reference) {
      const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ?').bind(event.reference).first() as any;
      if (payment) {
        const refundAmount = event.amount ? event.amount / 100 : payment.amount;
        await db.prepare(
          `UPDATE payments SET status = 'refunded', refunded_amount = ?, refunded_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).bind(refundAmount, payment.id).run();
      }
      return NextResponse.json({ status: 'acknowledged', event: event.event });
    }

    // Failed charges
    if (event.event === 'charge.failed' && event.reference) {
      const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ?').bind(event.reference).first() as any;
      if (payment && payment.status === 'pending') {
        await db.prepare(`UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?`).bind(payment.id).run();
      }
      return NextResponse.json({ status: 'acknowledged', event: event.event });
    }

    if (!event.isChargeSuccess || !event.reference) {
      return NextResponse.json({ status: 'acknowledged', event: event.event });
    }

    const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ?').bind(event.reference).first() as any;
    if (!payment) {
      logger.error('Paystack webhook: payment not found for reference', new Error(event.reference));
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Already processed (e.g. the client's own verify-poll beat the webhook here).
    if (payment.status === 'completed') {
      return NextResponse.json({ status: 'success', message: 'Already processed' });
    }

    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    metadata.paystack_event = event.event;
    metadata.paid_at = event.data?.paid_at;
    metadata.channel = event.data?.channel;
    metadata.domain = event.data?.domain;
    if (event.data?.domain === 'test') {
      // See matching check in api/payments/paystack/verify/route.ts - a
      // test-mode charge.success here means PAYSTACK_SECRET_KEY is a test
      // key, and this "successful" payment never touched a real bank.
      logger.error('Paystack webhook received TEST-mode charge.success - no real funds moved', new Error(`reference=${event.reference}`));
    }

    await db.prepare(
      `UPDATE payments SET status = 'completed', payment_date = datetime('now'), metadata = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(metadata), payment.id).run();

    // Digital deposit / final payment - this webhook is an independent
    // confirmation alongside the client's own fast-path verify-poll (see
    // api/intake/[id]/deposit/verify and .../final-payment/verify). Whichever
    // arrives first does the DB update and sends the email; guard on the
    // intake's own timestamp column (read *before* this webhook's update) so
    // the other one doesn't double-send.
    if (payment.payment_purpose === 'digital_deposit' || payment.payment_purpose === 'digital_final') {
      const intakeId = payment.project_intake_id;
      const intakeBefore = await getIntakeRequest(db, intakeId) as Record<string, any> | null;
      if (!intakeBefore) {
        logger.error('Paystack webhook: project intake not found for digital payment', new Error(`intakeId=${intakeId}`));
        return NextResponse.json({ status: 'acknowledged', event: event.event });
      }

      if (payment.payment_purpose === 'digital_deposit') {
        const alreadyHandled = !!intakeBefore.deposit_paid_at;
        if (!alreadyHandled) {
          await db.prepare(
            `UPDATE project_intake_requests SET deposit_paid_at = datetime('now'), deposit_payment_ref = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(event.reference, intakeId).run();

          const clientName = intakeBefore.name || intakeBefore.company_name || 'there';
          try {
            await sendDigitalDepositConfirmationEmail(
              intakeBefore.email, clientName, payment.amount, intakeBefore.total_price || 0, intakeBefore.final_amount || 0, event.reference
            );
          } catch (emailError) {
            logger.error('Paystack webhook: failed to send digital deposit confirmation email', emailError as Error);
          }
          try {
            await sendDigitalDepositAdminAlertEmail(
              clientName, intakeBefore.email, intakeBefore.company_name || intakeBefore.name || `Intake #${intakeId}`, payment.amount, intakeBefore.total_price || 0, intakeId
            );
          } catch (emailError) {
            logger.error('Paystack webhook: failed to send digital deposit admin alert email', emailError as Error);
          }
        }
      } else {
        const alreadyHandled = !!intakeBefore.final_paid_at;
        if (!alreadyHandled) {
          await db.prepare(
            `UPDATE project_intake_requests SET final_paid_at = datetime('now'), final_payment_ref = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(event.reference, intakeId).run();

          const clientName = intakeBefore.name || intakeBefore.company_name || 'there';
          try {
            await sendDigitalFinalPaymentConfirmationEmail(intakeBefore.email, clientName, payment.amount, event.reference);
          } catch (emailError) {
            logger.error('Paystack webhook: failed to send digital final payment confirmation email', emailError as Error);
          }
        }
      }

      return NextResponse.json({
        status: 'success',
        project_intake_id: intakeId,
        payment_id: payment.id,
        message: 'Digital payment processed',
      });
    }

    const bookingId = payment.booking_id;
    await db.prepare(`UPDATE bookings SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?`).bind(bookingId).run();

    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(bookingId).first() as any;

    if (booking) {
      try {
        await sendBookingConfirmationEmail(
          event.email || '',
          booking.client_name || 'Customer',
          booking.booking_date,
          booking.booking_time,
          booking.location || '',
          booking.service_type || 'standard'
        );
      } catch (emailError) {
        logger.error('Paystack webhook: failed to send confirmation email', emailError as Error);
      }

      // Zoho invoice + payment record (best-effort, non-fatal)
      try {
        const { createInvoice, recordPayment, findOrCreateContact } = await import('@/lib/zoho');
        const contactId = await findOrCreateContact(booking.client_name || 'Customer', event.email || '', '');
        if (contactId) {
          const amount = booking.discount_amount ? (event.amount! / 100 - booking.discount_amount) : event.amount! / 100;
          const invoiceResult = await createInvoice(contactId, [{
            name: booking.service_type || 'Cleaning Service',
            description: `Booking #${booking.id} - ${booking.service_type || 'Cleaning'}`,
            quantity: 1,
            rate: amount,
          }]) as any;

          const zohoInvoiceId = invoiceResult?.invoice?.invoice_id;
          if (zohoInvoiceId) {
            await recordPayment(zohoInvoiceId, amount, 'card', new Date().toISOString().split('T')[0]);
            await db.prepare(`UPDATE bookings SET zoho_invoice_id = ? WHERE id = ?`).bind(zohoInvoiceId, bookingId).run();
          }
        }
      } catch (zohoError) {
        logger.error('Paystack webhook: Zoho integration failed (non-fatal)', zohoError as Error);
      }
    }

    return NextResponse.json({
      status: 'success',
      booking_id: bookingId,
      payment_id: payment.id,
      message: 'Booking confirmed and payment processed',
    });
  } catch (error) {
    logger.error('Paystack webhook error', error as Error);
    return NextResponse.json({ error: `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
