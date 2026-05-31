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

    // Get total revenue from completed bookings
    // Note: This assumes bookings have a price/amount field. If not, we'll need to adjust.
    const totalRevenue = await db.prepare(
      `SELECT COALESCE(SUM(CAST(price AS REAL)), 0) as total FROM bookings 
       WHERE status = 'completed' AND deleted = 0`
    ).first();

    // Get revenue today
    const revenueToday = await db.prepare(
      `SELECT COALESCE(SUM(CAST(price AS REAL)), 0) as total FROM bookings 
       WHERE booking_date = ? AND status = 'completed' AND deleted = 0`
    ).bind(todayStr).first();

    // Get revenue this week
    const revenueWeek = await db.prepare(
      `SELECT COALESCE(SUM(CAST(price AS REAL)), 0) as total FROM bookings 
       WHERE booking_date >= ? AND booking_date <= ? AND status = 'completed' AND deleted = 0`
    ).bind(weekAgoStr, todayStr).first();

    // Get revenue this month
    const revenueMonth = await db.prepare(
      `SELECT COALESCE(SUM(CAST(price AS REAL)), 0) as total FROM bookings 
       WHERE booking_date >= ? AND booking_date <= ? AND status = 'completed' AND deleted = 0`
    ).bind(monthAgoStr, todayStr).first();

    // Get revenue by service type
    const revenueByType = await db.prepare(
      `SELECT service_type, COALESCE(SUM(CAST(price AS REAL)), 0) as total FROM bookings 
       WHERE status = 'completed' AND deleted = 0 
       GROUP BY service_type`
    ).all();

    // Get revenue by pool type
    const revenueByPool = await db.prepare(
      `SELECT pool_type, COALESCE(SUM(CAST(price AS REAL)), 0) as total FROM bookings 
       WHERE status = 'completed' AND deleted = 0 
       GROUP BY pool_type`
    ).all();

    // Get pending revenue (bookings not yet completed)
    const pendingRevenue = await db.prepare(
      `SELECT COALESCE(SUM(CAST(price AS REAL)), 0) as total FROM bookings 
       WHERE status != 'completed' AND status != 'cancelled' AND deleted = 0`
    ).first();

    const response = NextResponse.json({
      success: true,
      data: {
        total_revenue: (totalRevenue as any)?.total || 0,
        revenue_today: (revenueToday as any)?.total || 0,
        revenue_week: (revenueWeek as any)?.total || 0,
        revenue_month: (revenueMonth as any)?.total || 0,
        pending_revenue: (pendingRevenue as any)?.total || 0,
        currency: 'ZAR',
        by_type: (revenueByType.results || []).map((row: any) => ({
          service_type: row.service_type,
          total: row.total
        })),
        by_pool: (revenueByPool.results || []).map((row: any) => ({
          pool_type: row.pool_type,
          total: row.total
        }))
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Revenue analytics error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch revenue analytics',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
