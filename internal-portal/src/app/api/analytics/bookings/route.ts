export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30'; // default to last 30 days

    // Calculate date filters
    const daysAgo = parseInt(dateRange);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    // Get total bookings count
    const totalBookings = await db.prepare(
      'SELECT COUNT(*) as count FROM bookings WHERE deleted = 0'
    ).first();

    // Get bookings today
    const bookingsToday = await db.prepare(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE booking_date = ? AND deleted = 0`
    ).bind(todayStr).first();

    // Get bookings this week
    const bookingsWeek = await db.prepare(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE booking_date >= ? AND booking_date <= ? AND deleted = 0`
    ).bind(weekAgoStr, todayStr).first();

    // Get bookings this month
    const bookingsMonth = await db.prepare(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE booking_date >= ? AND booking_date <= ? AND deleted = 0`
    ).bind(monthAgoStr, todayStr).first();

    // Get bookings by status
    const bookingsByStatus = await db.prepare(
      `SELECT status, COUNT(*) as count FROM bookings 
       WHERE deleted = 0 
       GROUP BY status`
    ).all();

    // Get bookings by service type
    const bookingsByType = await db.prepare(
      `SELECT service_type, COUNT(*) as count FROM bookings 
       WHERE deleted = 0 
       GROUP BY service_type`
    ).all();

    // Get bookings by pool type
    const bookingsByPool = await db.prepare(
      `SELECT pool_type, COUNT(*) as count FROM bookings 
       WHERE deleted = 0 
       GROUP BY pool_type`
    ).all();

    const response = NextResponse.json({
      success: true,
      data: {
        total_bookings: (totalBookings as any)?.count || 0,
        bookings_today: (bookingsToday as any)?.count || 0,
        bookings_week: (bookingsWeek as any)?.count || 0,
        bookings_month: (bookingsMonth as any)?.count || 0,
        by_status: (bookingsByStatus.results || []).map((row: any) => ({
          status: row.status,
          count: row.count
        })),
        by_type: (bookingsByType.results || []).map((row: any) => ({
          service_type: row.service_type,
          count: row.count
        })),
        by_pool: (bookingsByPool.results || []).map((row: any) => ({
          pool_type: row.pool_type,
          count: row.count
        }))
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Bookings analytics error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch bookings analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
