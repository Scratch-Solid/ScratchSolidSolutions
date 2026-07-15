export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

const SEARCH_WINDOW_DAYS = 3;
// Matches the daily cap in internal-portal's pool-assignment.ts scorer - once
// a day/suburb already has this many bookings, suggest a different day
// instead of stacking further.
const MAX_SUGGESTED_PER_DAY = 2;

/**
 * Looks for existing (non-cancelled) bookings in the same suburb near the
 * client's preferred date, so the booking form can suggest joining that day
 * instead of spreading out - the cleaner then has two nearby jobs instead of
 * one, cutting travel time between them. This is a heuristic based on
 * marketing-site's own booking count, not a guaranteed cleaner-availability
 * check (actual cleaner assignment/capacity lives in internal-portal, a
 * separate database) - it's a suggestion, always overridable by the client.
 */
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const suburb = searchParams.get('suburb');
    const preferredDate = searchParams.get('date');

    if (!suburb || !preferredDate) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Missing required query params: suburb, date' }, { status: 400 }),
        traceId
      );
    }

    const preferred = new Date(`${preferredDate}T00:00:00Z`);
    if (isNaN(preferred.getTime())) {
      return withSecurityHeaders(NextResponse.json({ error: 'Invalid date' }, { status: 400 }), traceId);
    }

    // Check the client's own preferred date first, then the surrounding
    // window, closest days first, so the suggestion stays as close to what
    // they wanted as possible.
    const candidateDates: string[] = [];
    for (let offset = 0; offset <= SEARCH_WINDOW_DAYS; offset++) {
      for (const sign of offset === 0 ? [1] : [1, -1]) {
        const d = new Date(preferred);
        d.setUTCDate(d.getUTCDate() + offset * sign);
        const iso = d.toISOString().slice(0, 10);
        if (!candidateDates.includes(iso)) candidateDates.push(iso);
      }
    }

    for (const date of candidateDates) {
      const existing = await db.prepare(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE suburb = ? AND booking_date = ? AND status != 'cancelled'
      `).bind(suburb, date).first<{ count: number }>();

      const count = existing?.count ?? 0;
      if (count > 0 && count < MAX_SUGGESTED_PER_DAY) {
        const response = NextResponse.json({
          hasSuggestion: true,
          suggestedDate: date,
          isPreferredDate: date === preferredDate,
          existingBookingsCount: count,
        });
        return withSecurityHeaders(response, traceId);
      }
    }

    // No suitable existing cluster found within the window - this booking
    // becomes the seed for its suburb/date going forward.
    return withSecurityHeaders(NextResponse.json({ hasSuggestion: false }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to check booking clusters: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
