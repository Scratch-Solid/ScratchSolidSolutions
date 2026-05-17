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
    const cleanerId = searchParams.get('cleaner_id');
    const bookingId = searchParams.get('booking_id');
    const dateRange = searchParams.get('dateRange') || '30'; // default to last 30 days

    const daysAgo = parseInt(dateRange);
    const dateFilter = daysAgo > 0 ? `datetime('now', '-${daysAgo} days')` : null;

    // Get GPS tracking history
    let trackingQuery = `
      SELECT 
        DATE(recorded_at) as date,
        COUNT(*) as track_points,
        AVG(lat) as avg_lat,
        AVG(long) as avg_long,
        COUNT(DISTINCT status) as status_changes
      FROM gps_tracking_history
      WHERE 1=1
    `;
    const trackingParams: any[] = [];

    if (cleanerId) {
      trackingQuery += ' AND cleaner_id = ?';
      trackingParams.push(cleanerId);
    }
    if (bookingId) {
      trackingQuery += ' AND booking_id = ?';
      trackingParams.push(bookingId);
    }
    if (dateFilter) {
      trackingQuery += ` AND recorded_at >= ${dateFilter}`;
    }

    trackingQuery += ` GROUP BY DATE(recorded_at) ORDER BY date DESC LIMIT ${daysAgo}`;
    
    const trackingData = await db.prepare(trackingQuery).bind(...trackingParams).all();

    // Get travel time history
    let travelTimeQuery = `
      SELECT 
        cleaner_id,
        AVG(distance_km) as avg_distance,
        AVG(time_minutes) as avg_time,
        AVG(distance_km / time_minutes * 60) as avg_speed_kmh,
        COUNT(*) as trips
      FROM travel_time_history
      WHERE 1=1
    `;
    const travelTimeParams: any[] = [];

    if (cleanerId) {
      travelTimeQuery += ' AND cleaner_id = ?';
      travelTimeParams.push(cleanerId);
    }
    if (dateFilter) {
      travelTimeQuery += ` AND recorded_at >= ${dateFilter}`;
    }

    travelTimeQuery += ` GROUP BY cleaner_id ORDER BY trips DESC`;
    
    const travelTimeData = await db.prepare(travelTimeQuery).bind(...travelTimeParams).all();

    const response = NextResponse.json({
      success: true,
      data: {
        tracking: trackingData.results || [],
        travelTime: travelTimeData.results || [],
        summary: {
          totalTrackPoints: trackingData.results?.reduce((sum: number, row: any) => sum + row.track_points, 0) || 0,
          totalTrips: travelTimeData.results?.reduce((sum: number, row: any) => sum + row.trips, 0) || 0,
          avgDistance: travelTimeData.results?.reduce((sum: number, row: any) => sum + (row.avg_distance || 0), 0) / (travelTimeData.results?.length || 1) || 0,
          avgTime: travelTimeData.results?.reduce((sum: number, row: any) => sum + (row.avg_time || 0), 0) / (travelTimeData.results?.length || 1) || 0,
        }
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching tracking analytics', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch tracking analytics' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
