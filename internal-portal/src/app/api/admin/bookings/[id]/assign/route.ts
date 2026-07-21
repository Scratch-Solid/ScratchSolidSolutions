export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';

// Assigns ONE specific booking (the [id] in the URL) to ONE specific
// cleaner. This previously ignored `id` entirely and bulk round-robin
// assigned every pending booking instead - identical, in fact, to
// /api/admin/bookings/auto-assign (that endpoint's actual, correctly-named
// job). No current UI calls this route, so this was a dormant landmine
// rather than a live bug - fixed to match what the name and route shape
// (a single [id]) actually promise.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    const bookingId = parseInt(id);
    const body = await request.json() as { cleaner_id?: number };
    const cleanerId = body.cleaner_id;

    if (!cleanerId) {
      return withSecurityHeaders(NextResponse.json({ error: 'cleaner_id is required' }, { status: 400 }), traceId);
    }

    const booking = await db.prepare('SELECT id FROM bookings WHERE id = ?').bind(bookingId).first();
    if (!booking) {
      return withSecurityHeaders(NextResponse.json({ error: 'Booking not found' }, { status: 404 }), traceId);
    }

    // department = 'cleaning' keeps this scoped to cleaners only (2026-07-20
    // consolidation into staff).
    const cleaner = await db.prepare(
      `SELECT s.user_id FROM staff s WHERE s.user_id = ? AND s.blocked = 0 AND s.department = 'cleaning'`
    ).bind(cleanerId).first();
    if (!cleaner) {
      return withSecurityHeaders(NextResponse.json({ error: 'Cleaner not found or not available' }, { status: 400 }), traceId);
    }

    await db.prepare(
      'UPDATE bookings SET cleaner_id = ?, status = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(cleanerId, 'assigned', bookingId).run();

    return withSecurityHeaders(NextResponse.json({ message: 'Booking assigned', booking_id: bookingId, cleaner_id: cleanerId }), traceId);
  } catch (error) {
    return withSecurityHeaders(NextResponse.json({ error: `Failed to assign booking: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
