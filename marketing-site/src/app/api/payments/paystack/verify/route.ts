export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { verifyTransaction } from '@/lib/paystack';
import { sendBookingConfirmationEmail } from '@/lib/email';

// Implements Paystack verification directly against this app's own
// bookings/payments tables (see lib/paystack.ts header comment for why this
// was moved off backend-worker). Acts as a fallback/fast-path alongside the
// webhook - the client polls this right after the Paystack redirect back,
// so a customer sees "confirmed" immediately rather than waiting on the
// webhook round trip.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const userId = (user as any).user_id;

  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return withSecurityHeaders(NextResponse.json({ error: 'reference is required' }, { status: 400 }), traceId);
    }

    const payment = await db.prepare('SELECT * FROM payments WHERE external_payment_id = ? AND user_id = ?')
      .bind(reference, userId).first() as any;

    if (!payment) {
      return withSecurityHeaders(NextResponse.json({ error: 'Payment not found' }, { status: 404 }), traceId);
    }

    // Already confirmed (e.g. webhook beat us to it) - short-circuit.
    if (payment.status === 'completed') {
      return withSecurityHeaders(NextResponse.json({ status: 'success', message: 'Payment already confirmed' }), traceId);
    }

    const verifyResult = await verifyTransaction(reference);

    if (!verifyResult.status || !verifyResult.data || verifyResult.data.status !== 'success') {
      return withSecurityHeaders(NextResponse.json({
        status: 'failed',
        message: verifyResult.data?.status ? `Payment ${verifyResult.data.status}` : (verifyResult.message || 'Payment not successful'),
      }), traceId);
    }

    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    metadata.paystack_event = 'verify.success';
    metadata.paid_at = verifyResult.data.paid_at;
    metadata.channel = verifyResult.data.channel;
    metadata.domain = verifyResult.data.domain;
    if (verifyResult.data.domain === 'test') {
      // A test-mode transaction reports "success" without ever touching a
      // real bank - if this fires outside local/staging testing, the
      // configured PAYSTACK_SECRET_KEY is a test key where a live key
      // should be, and no customer has actually been charged.
      logger.error('Paystack transaction verified in TEST mode - no real funds moved', new Error(`reference=${reference}`));
    }

    await db.prepare(`
      UPDATE payments SET status = 'completed', payment_date = datetime('now'), metadata = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(JSON.stringify(metadata), payment.id).run();

    await db.prepare(`UPDATE bookings SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?`)
      .bind(payment.booking_id).run();

    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(payment.booking_id).first() as any;
    if (booking) {
      try {
        await sendBookingConfirmationEmail(
          verifyResult.data.customer.email,
          booking.client_name || 'Customer',
          booking.booking_date,
          booking.booking_time,
          booking.location || '',
          booking.service_type || 'standard'
        );
      } catch (emailError) {
        logger.error('Failed to send payment confirmation email', emailError as Error);
      }
    }

    const response = NextResponse.json({ status: 'success', message: 'Payment successful! Your booking has been confirmed.' });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Paystack verify error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
