export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { validateLength } from '@/lib/validation';

const BALANCE_TRACKED_TYPES = ['sick', 'annual'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const adminId = (user as any)?.user_id || user?.id;

  const { id } = await params;
  const requestId = parseInt(id);

  try {
    const body = await request.json() as { action?: 'approve' | 'reject'; rejection_reason?: string };
    const { action, rejection_reason } = body;

    if (action !== 'approve' && action !== 'reject') {
      return withSecurityHeaders(NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 }), traceId);
    }
    if (action === 'reject' && rejection_reason) {
      const reasonValidation = validateLength(rejection_reason, 'rejection_reason');
      if (!reasonValidation.valid) {
        return withSecurityHeaders(NextResponse.json({ error: reasonValidation.errors.join(', ') }, { status: 400 }), traceId);
      }
    }

    const leaveRequest = await db.prepare(
      `SELECT * FROM leave_requests WHERE id = ? AND status = 'pending'`
    ).bind(requestId).first() as any;

    if (!leaveRequest) {
      return withSecurityHeaders(NextResponse.json({ error: 'Leave request not found or already processed' }, { status: 404 }), traceId);
    }

    if (action === 'approve') {
      await db.prepare(
        `UPDATE leave_requests SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(adminId, requestId).run();

      // Deduct from the matching balance if this leave type is tracked
      // (sick/annual) - personal/other aren't allocated a balance.
      if (BALANCE_TRACKED_TYPES.includes(leaveRequest.type)) {
        const year = new Date(leaveRequest.start_date).getFullYear();
        await db.prepare(
          `UPDATE leave_balances
           SET used_days = used_days + ?, remaining_days = remaining_days - ?, updated_at = datetime('now')
           WHERE user_id = ? AND leave_type = ? AND year = ?`
        ).bind(leaveRequest.days, leaveRequest.days, leaveRequest.user_id, leaveRequest.type, year).run();
      }
    } else {
      await db.prepare(
        `UPDATE leave_requests SET status = 'rejected', approved_by = ?, approved_at = datetime('now'), rejection_reason = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(adminId, rejection_reason || null, requestId).run();
    }

    const updated = await db.prepare(`SELECT * FROM leave_requests WHERE id = ?`).bind(requestId).first();
    const response = NextResponse.json({ data: updated });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to process leave request: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
