export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import { processWebhookEvent, verifyWebhookSignature } from '@/lib/paystack';
import { sendBookingConfirmationEmail } from '@/lib/email';

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

    const bookingId = payment.booking_id;
    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    metadata.paystack_event = event.event;
    metadata.paid_at = event.data?.paid_at;
    metadata.channel = event.data?.channel;

    await db.prepare(
      `UPDATE payments SET status = 'completed', payment_date = datetime('now'), metadata = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(metadata), payment.id).run();

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
