export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

// Read-only: suggests the best available cleaner for ONE specific booking
// (lowest current workload), without writing anything. This previously
// ignored the [id] param and its own read-only name entirely - it was a
// byte-for-byte copy of auto-assign that WROTE bulk assignments for every
// pending booking. No current UI calls this route, so this was a dormant
// landmine rather than a live bug.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);

  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    const booking = await db.prepare('SELECT id FROM bookings WHERE id = ?').bind(bookingId).first();
    if (!booking) {
      return withSecurityHeaders(NextResponse.json({ error: 'Booking not found' }, { status: 404 }), traceId);
    }

    // department = 'cleaning' keeps this scoped to cleaners only (2026-07-20
    // consolidation into staff).
    const cleaners = await db.prepare(
      `SELECT s.user_id, s.first_name, s.last_name, u.email
       FROM staff s
       JOIN users u ON s.user_id = u.id
       WHERE s.blocked = 0 AND s.status = 'idle' AND s.department = 'cleaning'`
    ).all();

    const availableCleaners = (cleaners.results || []) as any[];
    if (availableCleaners.length === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'No available cleaners' }, { status: 400 }), traceId);
    }

    const workloads: Record<number, number> = {};
    for (const cleaner of availableCleaners) {
      const workload = await db.prepare(
        `SELECT COUNT(*) as count FROM bookings WHERE cleaner_id = ? AND status IN ('assigned', 'on_way', 'arrived')`
      ).bind(cleaner.user_id).first();
      workloads[cleaner.user_id] = (workload as any)?.count || 0;
    }

    const suggested = [...availableCleaners].sort(
      (a, b) => workloads[a.user_id] - workloads[b.user_id]
    )[0];

    return withSecurityHeaders(NextResponse.json({
      booking_id: bookingId,
      suggested_cleaner: {
        cleaner_id: suggested.user_id,
        name: `${suggested.first_name} ${suggested.last_name}`.trim(),
        email: suggested.email,
        current_workload: workloads[suggested.user_id],
      },
    }), traceId);
  } catch (error) {
    return withSecurityHeaders(NextResponse.json({ error: `Failed to suggest cleaner: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
