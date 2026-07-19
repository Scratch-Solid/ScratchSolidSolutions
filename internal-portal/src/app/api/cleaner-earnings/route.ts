export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '../../../lib/middleware';
import { CLEANER_RATE_PER_TASK } from '../../../lib/pay-rates';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const requestingUserId = (user as any)?.user_id || user?.id;
  const requestingRole = (user as any)?.role;

  try {
    const { searchParams } = new URL(request.url);
    const requestedCleanerId = searchParams.get('cleaner_id');

    // A cleaner may only ever see their own earnings - only admins can look
    // up someone else's (previously any cleaner could pass any cleaner_id).
    const cleanerId = requestingRole === 'admin' && requestedCleanerId
      ? parseInt(requestedCleanerId)
      : requestingUserId;

    if (!cleanerId) {
      return withSecurityHeaders(NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 }), traceId);
    }

    // booking_assignments.staff_id references users(id) directly (migration
    // 024) - one row per completed task, flat R150 each.
    const result = await db.prepare(
      `SELECT ba.id, ba.booking_id, ba.completed_at
       FROM booking_assignments ba
       WHERE ba.staff_id = ? AND ba.assignment_status = 'completed'
       ORDER BY ba.completed_at DESC`
    ).bind(cleanerId).all();

    const rows = (result.results || []).map((row: any) => ({
      id: row.id,
      booking_id: row.booking_id,
      completed_at: row.completed_at,
      earnings: CLEANER_RATE_PER_TASK,
    }));

    const response = NextResponse.json(rows);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch cleaner earnings: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
