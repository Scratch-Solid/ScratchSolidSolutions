export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const { id } = await params;

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  try {
    const body = await request.json() as {
      new_date?: string;
      new_time?: string;
    };
    const { new_date, new_time } = body;
    const userId = (user as any).user_id;
    const userRole = (user as any).role;

    if (!new_date || !new_time) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'new_date and new_time are required' }, { status: 400 }),
        traceId
      );
    }

    // Fetch booking
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(parseInt(id)).first();
    if (!booking) {
      return withSecurityHeaders(NextResponse.json({ error: 'Booking not found' }, { status: 404 }), traceId);
    }

    // Ownership check
    if (userRole !== 'admin' && (booking as any).client_id !== userId && (booking as any).user_id !== userId) {
      return withSecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), traceId);
    }

    // Only pending or confirmed bookings can be rescheduled
    const allowedStatuses = ['pending', 'confirmed', 'awaiting_payment'];
    if (!allowedStatuses.includes((booking as any).status)) {
      return withSecurityHeaders(
        NextResponse.json({ error: `Booking with status '${(booking as any).status}' cannot be rescheduled` }, { status: 400 }),
        traceId
      );
    }

    // 24h window check
    const bookingDateTime = new Date(`${(booking as any).booking_date}T${(booking as any).booking_time || '00:00'}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < 24 && hoursUntilBooking > 0) {
      return withSecurityHeaders(
        NextResponse.json({
          error: 'Rescheduling is not allowed within 24 hours of the booking. Please contact us directly.',
        }, { status: 400 }),
        traceId
      );
    }

    if (hoursUntilBooking <= 0) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Cannot reschedule a booking that has already passed' }, { status: 400 }),
        traceId
      );
    }

    // Store original slot for audit trail
    const originalSlot = `${(booking as any).booking_date} ${(booking as any).booking_time || ''}`.trim();

    // Update booking
    await db.prepare(`
      UPDATE bookings
      SET booking_date = ?,
          booking_time = ?,
          rescheduled_from = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(new_date, new_time, originalSlot, parseInt(id)).run();

    logger.info(`Booking ${id} rescheduled from ${originalSlot} to ${new_date} ${new_time}`);

    return withSecurityHeaders(
      NextResponse.json({
        status: 'success',
        booking_id: parseInt(id),
        new_date,
        new_time,
        rescheduled_from: originalSlot,
        message: 'Booking rescheduled successfully',
      }),
      traceId
    );
  } catch (error) {
    logger.error('Error rescheduling booking', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to reschedule booking: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
