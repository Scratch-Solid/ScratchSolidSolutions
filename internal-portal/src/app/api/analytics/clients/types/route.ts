export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    // Get client types breakdown for pie chart
    const clientTypes = await db.prepare(
      `SELECT 
         CASE 
           WHEN department = 'business' OR department LIKE '%business%' THEN 'Business'
           ELSE 'Individual'
         END as client_type,
         COUNT(*) as count 
       FROM users 
       WHERE role = 'client' AND deleted = 0 
       GROUP BY client_type`
    ).all();

    // Get client types by bookings for pie chart
    const clientTypesByBookings = await db.prepare(
      `SELECT 
         b.pool_type as client_type,
         COUNT(*) as count 
       FROM bookings b
       WHERE b.deleted = 0
       GROUP BY b.pool_type`
    ).all();

    // Get client types by revenue for pie chart
    const clientTypesByRevenue = await db.prepare(
      `SELECT 
         b.pool_type as client_type,
         COALESCE(SUM(CAST(b.price AS REAL)), 0) as total 
       FROM bookings b
       WHERE b.status = 'completed' AND b.deleted = 0
       GROUP BY b.pool_type`
    ).all();

    const response = NextResponse.json({
      success: true,
      data: {
        by_user_count: (clientTypes.results || []).map((row: any) => ({
          client_type: row.client_type,
          count: row.count
        })),
        by_booking_count: (clientTypesByBookings.results || []).map((row: any) => ({
          client_type: row.client_type,
          count: row.count
        })),
        by_revenue: (clientTypesByRevenue.results || []).map((row: any) => ({
          client_type: row.client_type,
          total: row.total
        })),
        currency: 'ZAR'
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Client types analytics error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch client types analytics',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
