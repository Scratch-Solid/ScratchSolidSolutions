export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { validateLength } from '@/lib/validation';

const LEAVE_TYPES = ['sick', 'annual', 'personal', 'other'];

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'digital', 'admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const userId = (user as any)?.user_id || user?.id;

  try {
    const result = await db.prepare(
      `SELECT id, type, start_date, end_date, days, reason, status, rejection_reason, approved_at, created_at
       FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC`
    ).bind(userId).all();

    const response = NextResponse.json({ data: result.results || [] });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch leave requests: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'digital', 'admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const userId = (user as any)?.user_id || user?.id;

  try {
    const body = await request.json() as { type?: string; start_date?: string; end_date?: string; reason?: string };
    const { type, start_date, end_date, reason } = body;

    if (!type || !LEAVE_TYPES.includes(type)) {
      return withSecurityHeaders(NextResponse.json({ error: `type must be one of: ${LEAVE_TYPES.join(', ')}` }, { status: 400 }), traceId);
    }
    const start = start_date ? new Date(start_date) : null;
    const end = end_date ? new Date(end_date) : null;
    if (!start_date || !start || isNaN(start.getTime())) {
      return withSecurityHeaders(NextResponse.json({ error: 'start_date is required and must be a valid date' }, { status: 400 }), traceId);
    }
    if (!end_date || !end || isNaN(end.getTime())) {
      return withSecurityHeaders(NextResponse.json({ error: 'end_date is required and must be a valid date' }, { status: 400 }), traceId);
    }
    if (reason) {
      const reasonValidation = validateLength(reason, 'reason', { max: 1000 });
      if (!reasonValidation.valid) {
        return withSecurityHeaders(NextResponse.json({ error: reasonValidation.errors.join(', ') }, { status: 400 }), traceId);
      }
    }
    if (end < start) {
      return withSecurityHeaders(NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 }), traceId);
    }
    // Inclusive day count - simple calendar days, not working-days-only.
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    const result = await db.prepare(
      `INSERT INTO leave_requests (user_id, type, start_date, end_date, days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending') RETURNING *`
    ).bind(userId, type, start_date, end_date, days, reason || null).first();

    const response = NextResponse.json({ data: result }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to submit leave request: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
