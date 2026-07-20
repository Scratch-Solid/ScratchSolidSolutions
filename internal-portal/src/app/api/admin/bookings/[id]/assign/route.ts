export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    // Get all pending bookings
    const pendingBookings = await db.prepare(
      'SELECT * FROM bookings WHERE status = ? AND cleaner_id IS NULL'
    ).bind('pending').all();

    const bookings = pendingBookings.results || [];

    if (bookings.length === 0) {
      return NextResponse.json({ message: 'No pending bookings to assign', assigned: 0 });
    }

    // Get available cleaners (not blocked, idle). department = 'cleaning'
    // keeps this scoped to cleaners only (2026-07-20 consolidation). See
    // the note in admin/bookings/auto-assign/route.ts (identical logic,
    // pre-existing cleaner_id/user_id FK mismatch, out of scope here).
    const cleaners = await db.prepare(
      `SELECT s.*, u.email, u.name
       FROM staff s
       JOIN users u ON s.user_id = u.id
       WHERE s.blocked = 0 AND s.status = 'idle' AND s.department = 'cleaning'`
    ).all();

    const availableCleaners = cleaners.results || [];

    if (availableCleaners.length === 0) {
      return NextResponse.json({ message: 'No available cleaners', assigned: 0 }, { status: 400 });
    }

    // Get current workload for each cleaner
    const cleanerWorkloads: any = {};
    for (const cleaner of availableCleaners) {
      const workload = await db.prepare(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE cleaner_id = ? AND status IN ('assigned', 'on_way', 'arrived')`
      ).bind((cleaner as any).user_id).first();
      cleanerWorkloads[(cleaner as any).user_id] = (workload as any)?.count || 0;
    }

    // Assign bookings to cleaners with lowest workload (round-robin style)
    let assignedCount = 0;
    let cleanerIndex = 0;

    for (const booking of bookings as any[]) {
      // Find cleaner with minimum workload
      const sortedCleaners = [...availableCleaners].sort((a, b) => {
        const workloadA = cleanerWorkloads[(a as any).user_id] || 0;
        const workloadB = cleanerWorkloads[(b as any).user_id] || 0;
        return workloadA - workloadB;
      });

      const selectedCleaner = sortedCleaners[0];
      const cleanerId = (selectedCleaner as any).user_id;

      // Assign booking
      await db.prepare(
        'UPDATE bookings SET cleaner_id = ?, status = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(cleanerId, 'assigned', booking.id).run();

      // Update workload
      cleanerWorkloads[cleanerId]++;

      assignedCount++;
    }

    return NextResponse.json({ message: `Auto-assigned ${assignedCount} bookings`, assigned: assignedCount });
  } catch (error) {
    return NextResponse.json({ error: `Failed to auto-assign bookings: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
