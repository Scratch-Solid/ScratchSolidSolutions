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
    const days = parseInt(searchParams.get('days') || '30'); // default to last 30 days

    // Calculate date range
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Get daily booking counts for the line chart
    const dailyBookings = await db.prepare(
      `SELECT 
         DATE(booking_date) as date,
         COUNT(*) as count,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM bookings 
       WHERE booking_date >= ? AND booking_date <= ? AND deleted = 0
       GROUP BY DATE(booking_date)
       ORDER BY date ASC`
    ).bind(startDateStr, todayStr).all();

    // Fill in missing dates with zero counts
    const trendData: any[] = [];
    const dateMap = new Map();
    
    for (const row of (dailyBookings.results || [])) {
      dateMap.set((row as any).date, row);
    }

    // Generate all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      
      trendData.push({
        date: dateStr,
        total: data ? (data as any).count : 0,
        completed: data ? (data as any).completed : 0,
        pending: data ? (data as any).pending : 0,
        cancelled: data ? (data as any).cancelled : 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const response = NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDateStr,
          end: todayStr,
          days
        },
        trend: trendData
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Bookings trend analytics error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch bookings trend analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
