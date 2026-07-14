export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    // Get client locations for map/heatmap
    // Note: This assumes bookings have address/location data. If not, we'll need to adjust.
    const clientLocations = await db.prepare(
      `SELECT 
         b.address,
         b.city,
         b.province,
         COUNT(*) as booking_count,
         COALESCE(SUM(CAST(b.price AS REAL)), 0) as total_revenue
       FROM bookings b
       WHERE b.deleted = 0 AND b.address IS NOT NULL
       GROUP BY b.city, b.province
       ORDER BY booking_count DESC
       LIMIT 100`
    ).all();

    // Get location breakdown by province
    const locationsByProvince = await db.prepare(
      `SELECT 
         b.province,
         COUNT(*) as booking_count,
         COALESCE(SUM(CAST(b.price AS REAL)), 0) as total_revenue
       FROM bookings b
       WHERE b.deleted = 0 AND b.province IS NOT NULL
       GROUP BY b.province
       ORDER BY booking_count DESC`
    ).all();

    // Get location breakdown by city
    const locationsByCity = await db.prepare(
      `SELECT 
         b.city,
         b.province,
         COUNT(*) as booking_count,
         COALESCE(SUM(CAST(b.price AS REAL)), 0) as total_revenue
       FROM bookings b
       WHERE b.deleted = 0 AND b.city IS NOT NULL
       GROUP BY b.city, b.province
       ORDER BY booking_count DESC
       LIMIT 50`
    ).all();

    const response = NextResponse.json({
      success: true,
      data: {
        locations: (clientLocations.results || []).map((row: any) => ({
          address: row.address,
          city: row.city,
          province: row.province,
          booking_count: row.booking_count,
          total_revenue: row.total_revenue
        })),
        by_province: (locationsByProvince.results || []).map((row: any) => ({
          province: row.province,
          booking_count: row.booking_count,
          total_revenue: row.total_revenue
        })),
        by_city: (locationsByCity.results || []).map((row: any) => ({
          city: row.city,
          province: row.province,
          booking_count: row.booking_count,
          total_revenue: row.total_revenue
        })),
        currency: 'ZAR'
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Client locations analytics error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch client locations analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
