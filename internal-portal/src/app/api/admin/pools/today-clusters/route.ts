export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * Shows the admin which suburbs have a real same-day cluster today (2+
 * bookings, meaning a cleaner can realistically do both) versus which have
 * only a single booking (an opportunity to actively promote that day/area
 * to close the gap) - the visibility half of the area-clustering feature.
 */
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const result = await db.prepare(`
      SELECT suburb, COUNT(*) as booking_count
      FROM bookings
      WHERE booking_date = date('now') AND status != 'cancelled' AND suburb IS NOT NULL
      GROUP BY suburb
      ORDER BY booking_count DESC
    `).all<{ suburb: string; booking_count: number }>();

    const rows = result.results || [];
    const clustered = rows.filter(r => r.booking_count >= 2);
    const singles = rows.filter(r => r.booking_count === 1);

    return withSecurityHeaders(NextResponse.json({ clustered, singles }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch today's clusters: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
