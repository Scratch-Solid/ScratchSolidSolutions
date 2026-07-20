export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // department = 'cleaning' keeps this scoped to cleaners only, matching
    // cleaner_profiles' old implicit scope now that staff also holds
    // supervisors/digital/transport rows (2026-07-20 consolidation).
    let query = `
      SELECT s.*, u.email, u.role, u.deleted as user_deleted, u.first_name, u.last_name
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE s.department = 'cleaning'
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    const cleaners = await db.prepare(query).bind(...params).all();
    const response = NextResponse.json(cleaners.results || []);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch cleaners: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as { cleaner_id?: number; blocked?: boolean; status?: string; assignment_pool?: string };
    const { cleaner_id, blocked, status, assignment_pool } = body;

    if (!cleaner_id) {
      const response = NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (blocked !== undefined) {
      updates.push('blocked = ?');
      values.push(blocked ? 1 : 0);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (assignment_pool) {
      if (assignment_pool !== 'AUTO' && assignment_pool !== 'MANUAL') {
        const response = NextResponse.json({ error: 'assignment_pool must be AUTO or MANUAL' }, { status: 400 });
        return withSecurityHeaders(response, traceId);
      }
      updates.push('assignment_pool = ?');
      values.push(assignment_pool);
    }

    if (updates.length === 0) {
      const response = NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    updates.push('updated_at = datetime("now")');
    values.push(cleaner_id);

    await db.prepare(
      `UPDATE staff SET ${updates.join(', ')} WHERE user_id = ?`
    ).bind(...values).run();

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to update cleaner: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
