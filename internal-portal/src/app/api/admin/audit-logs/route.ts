export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withSecurityHeaders, withTracing } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (user_id) {
      conditions.push('al.user_id = ?');
      params.push(user_id);
    }
    if (action) {
      conditions.push('al.action LIKE ?');
      params.push(`%${action}%`);
    }
    if (resource) {
      conditions.push('al.resource_type LIKE ?');
      params.push(`%${resource}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = await db.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs al';
    const countConditions: string[] = [];
    const countParams: any[] = [];
    if (user_id) {
      countConditions.push('al.user_id = ?');
      countParams.push(user_id);
    }
    if (action) {
      countConditions.push('al.action LIKE ?');
      countParams.push(`%${action}%`);
    }
    if (resource) {
      countConditions.push('al.resource_type LIKE ?');
      countParams.push(`%${resource}%`);
    }
    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }
    const countResult = await db.prepare(countQuery).bind(...countParams).first();
    const total = (countResult as any)?.total || 0;

    const response = NextResponse.json({
      auditLogs: logs.results || [],
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    const response = NextResponse.json({
      error: 'Failed to fetch audit logs'
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
