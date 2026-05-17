import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const cleanerId = searchParams.get('cleaner_id');

    if (!bookingId && !cleanerId) {
      const response = NextResponse.json({ error: 'Missing booking_id or cleaner_id' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Verify user has access to this booking
    if (bookingId) {
      const booking = await db.prepare(
        'SELECT client_id, cleaner_id FROM bookings WHERE id = ?'
      ).bind(bookingId).first();

      if (!booking) {
        const response = NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        return withSecurityHeaders(response, traceId);
      }

      const userId = (user as any).id;
      const userRole = (user as any).role;

      // Only allow client who owns the booking or admin to view tracking
      if (userRole !== 'admin' && booking.client_id !== userId) {
        const response = NextResponse.json({ error: 'Access denied' }, { status: 403 });
        return withSecurityHeaders(response, traceId);
      }

      // Get cleaner location from database
      const dbLocation = await db.prepare(
        'SELECT gps_lat, gps_long, last_location_update FROM bookings WHERE id = ?'
      ).bind(bookingId).first();

      const response = NextResponse.json({
        booking_id: bookingId,
        cleaner_id: booking.cleaner_id,
        gps_lat: dbLocation?.gps_lat || null,
        gps_long: dbLocation?.gps_long || null,
        last_update: dbLocation?.last_location_update || null,
        source: 'database'
      });
      response.headers.set('Cache-Control', 'private, max-age=5');
      return withSecurityHeaders(response, traceId);
    }

    // If cleaner_id is provided
    if (cleanerId) {
      // Verify user has access (admin or the cleaner themselves)
      const userId = (user as any).id;
      const userRole = (user as any).role;

      if (userRole !== 'admin' && parseInt(cleanerId) !== userId) {
        const response = NextResponse.json({ error: 'Access denied' }, { status: 403 });
        return withSecurityHeaders(response, traceId);
      }

      // Get cleaner location from database
      const dbLocation = await db.prepare(
        'SELECT gps_lat, gps_long, updated_at FROM cleaner_profiles WHERE user_id = ?'
      ).bind(cleanerId).first();

      const response = NextResponse.json({
        cleaner_id: cleanerId,
        gps_lat: dbLocation?.gps_lat || null,
        gps_long: dbLocation?.gps_long || null,
        last_update: dbLocation?.updated_at || null,
        source: 'database'
      });
      response.headers.set('Cache-Control', 'private, max-age=5');
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching tracking data', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
