export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { processRefund } from '@/lib/paystack';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const { id } = await params;

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  try {
    const body = await request.json() as { reason?: string };
    const reason = body.reason || 'Client cancellation';
    const userId = (user as any).user_id;
    const userRole = (user as any).role;

    // Fetch booking
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(parseInt(id)).first();
    if (!booking) {
      return withSecurityHeaders(NextResponse.json({ error: 'Booking not found' }, { status: 404 }), traceId);
    }

    // Ownership check (admin can cancel any)
    if (userRole !== 'admin' && (booking as any).client_id !== userId && (booking as any).user_id !== userId) {
      return withSecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), traceId);
    }

    // Already cancelled?
    if ((booking as any).status === 'cancelled') {
      return withSecurityHeaders(NextResponse.json({ error: 'Booking already cancelled' }, { status: 409 }), traceId);
    }

    // 24h window check
    const bookingDateTime = new Date(`${(booking as any).booking_date}T${(booking as any).booking_time || '00:00'}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundEligible = false;
    let refundAmount = 0;

    if (hoursUntilBooking >= 24) {
      refundEligible = true;
      refundAmount = (booking as any).total_amount || (booking as any).quote_amount || 0;
    } else if (hoursUntilBooking > 0) {
      // Late cancellation — no refund, but allow cancel
      refundEligible = false;
      refundAmount = 0;
    } else {
      // Booking time has passed — cannot cancel
      return withSecurityHeaders(
        NextResponse.json({ error: 'Cannot cancel a booking that has already passed its scheduled time' }, { status: 400 }),
        traceId
      );
    }

    // Update booking status
    await db.prepare(`
      UPDATE bookings
      SET status = 'cancelled',
          cancellation_reason = ?,
          cancelled_at = datetime('now'),
          cancelled_by = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(reason, userRole, parseInt(id)).run();

    // If refund eligible and there's a Paystack payment, process the refund
    // directly against our own DB (previously round-tripped through
    // backend-worker's disconnected database - see lib/paystack.ts).
    let refundResult = null;
    if (refundEligible && refundAmount > 0) {
      const payment = await db.prepare(
        'SELECT * FROM payments WHERE booking_id = ? AND status = ? AND gateway = ? ORDER BY id DESC LIMIT 1'
      ).bind(parseInt(id), 'completed', 'paystack').first();

      if (payment && (payment as any).external_payment_id) {
        try {
          const result = await processRefund(db, {
            reference: (payment as any).external_payment_id,
            amount: refundAmount,
            reason,
          });
          refundResult = result.ok
            ? { status: 'success', refund: result.data }
            : { error: result.error, detail: 'detail' in result ? result.detail : undefined };
        } catch (refundError) {
          logger.error('Paystack refund failed during cancellation', refundError as Error);
          // Booking is still cancelled — refund will be retried manually
        }
      } else {
        // Cash/EFT payment — mark for manual refund
        await db.prepare(`
          UPDATE payments SET status = 'refund_pending', refund_reason = ?, updated_at = datetime('now')
          WHERE booking_id = ? AND status = 'completed'
        `).bind(reason, parseInt(id)).run();
      }
    }

    return withSecurityHeaders(
      NextResponse.json({
        status: 'success',
        booking_id: parseInt(id),
        refund_eligible: refundEligible,
        refund_amount: refundAmount,
        refund_result: refundResult,
        message: refundEligible
          ? 'Booking cancelled. Refund will be processed.'
          : 'Booking cancelled within 24h window. No refund available per policy.',
      }),
      traceId
    );
  } catch (error) {
    logger.error('Error cancelling booking', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
