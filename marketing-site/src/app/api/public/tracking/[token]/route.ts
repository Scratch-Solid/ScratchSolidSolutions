import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const traceId = withTracing(request);
  const { token } = params;

  try {
    const db = await getDb();
    if (!db) {
      const response = NextResponse.json({ error: 'Database not available' }, { status: 500 });
      return withSecurityHeaders(response, traceId);
    }

    if (!token) {
      const response = NextResponse.json({ error: 'Missing token' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Get booking by tracking token
    const booking = await db.prepare(
      'SELECT * FROM bookings WHERE tracking_token = ?'
    ).bind(token).first();

    if (!booking) {
      const response = NextResponse.json({ error: 'Invalid tracking token' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    // Get cleaner status
    let cleanerStatus = null;
    if (booking.cleaner_id) {
      cleanerStatus = await db.prepare(
        'SELECT status, gps_lat, gps_long, updated_at FROM cleaner_profiles WHERE user_id = ?'
      ).bind(booking.cleaner_id).first();
    }

    // Prepare response data
    const responseData = {
      booking: {
        id: booking.id,
        service_name: booking.service_name,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        location: booking.location,
        status: booking.status
      },
      cleanerStatus: cleanerStatus ? {
        status: cleanerStatus.status,
        cleaner_name: booking.first_name && booking.last_name 
          ? `${booking.first_name} ${booking.last_name}` 
          : null
      } : null,
      gpsLocation: booking.gps_lat && booking.gps_long ? {
        gps_lat: booking.gps_lat,
        gps_long: booking.gps_long,
        last_update: booking.last_location_update
      } : null
    };

    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching public tracking data', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
