import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');

    if (!bookingId) {
      const response = NextResponse.json({ error: 'Missing booking_id' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Get booking details
    const booking = await db.prepare(
      'SELECT * FROM bookings WHERE id = ?'
    ).bind(bookingId).first();

    if (!booking) {
      const response = NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    // For multi-cleaner tracking, we would need to support multiple cleaners per booking
    // For now, return the single cleaner's location
    const cleanerId = (booking as any).cleaner_id;
    
    if (!cleanerId) {
      const response = NextResponse.json({ error: 'No cleaner assigned' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    // Get cleaner GPS from KV or database
    const cleaner = await db.prepare(
      'SELECT gps_lat, gps_long, status, updated_at FROM cleaner_profiles WHERE user_id = ?'
    ).bind(cleanerId).first();

    if (!cleaner) {
      const response = NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json({
      booking_id: bookingId,
      cleaners: [
        {
          cleaner_id: cleanerId,
          gps_lat: (cleaner as any).gps_lat,
          gps_long: (cleaner as any).gps_long,
          status: (cleaner as any).status,
          last_update: (cleaner as any).updated_at
        }
      ],
      note: 'Multi-cleaner support requires database schema update to allow multiple cleaners per booking'
    });
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching multi-cleaner tracking', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch multi-cleaner tracking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
