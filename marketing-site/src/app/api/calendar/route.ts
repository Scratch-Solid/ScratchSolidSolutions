import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = (user as any).id;

    let query = `
      SELECT 
        b.id,
        b.booking_date,
        b.booking_time,
        b.location,
        b.service_type,
        b.status,
        b.tracking_token,
        c.first_name as cleaner_first_name,
        c.last_name as cleaner_last_name
      FROM bookings b
      LEFT JOIN users c ON b.cleaner_id = c.id
      WHERE b.client_id = ?
    `;
    const params: any[] = [userId];

    if (startDate) {
      query += ' AND b.booking_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND b.booking_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY b.booking_date, b.booking_time';

    const bookings = await db.prepare(query).bind(...params).all();

    // Format as calendar events
    const events = (bookings.results || []).map((booking: any) => ({
      id: booking.id,
      title: `${booking.service_type} - ${booking.location}`,
      start: `${booking.booking_date}T${booking.booking_time}`,
      status: booking.status,
      tracking_token: booking.tracking_token,
      cleaner: booking.cleaner_first_name ? `${booking.cleaner_first_name} ${booking.cleaner_last_name}` : null
    }));

    const response = NextResponse.json(events);
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching calendar events', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      booking_id?: number;
      new_date?: string;
      new_time?: string;
    };
    const { booking_id, new_date, new_time } = body;
    const userId = (user as any).id;

    if (!booking_id || !new_date || !new_time) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Verify booking ownership
    const booking = await db.prepare(
      'SELECT client_id, status FROM bookings WHERE id = ?'
    ).bind(booking_id).first();

    if (!booking || (booking as any).client_id !== userId) {
      const response = NextResponse.json({ error: 'Booking not found or unauthorized' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    // Check if booking can be rescheduled (only pending bookings)
    if ((booking as any).status !== 'pending') {
      const response = NextResponse.json({ error: 'Booking cannot be rescheduled' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Update booking date and time
    await db.prepare(
      'UPDATE bookings SET booking_date = ?, booking_time = ? WHERE id = ?'
    ).bind(new_date, new_time, booking_id).run();

    logger.info(`Booking ${booking_id} rescheduled to ${new_date} ${new_time}`);

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error rescheduling booking', error as Error);
    const response = NextResponse.json({ error: 'Failed to reschedule booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
