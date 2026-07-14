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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

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

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = await db.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs al';
    const countParams: any[] = [];
    if (user_id) {
      countQuery += ' WHERE al.user_id = ?';
      countParams.push(user_id);
    }
    const countResult = await db.prepare(countQuery).bind(...countParams).first();
    const total = (countResult as any)?.total || 0;

    const response = NextResponse.json({
      data: logs.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Audit log fetch error:', error);
    const response = NextResponse.json({ error: `Failed to fetch audit logs: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as { user_id?: number; action?: string; resource_type?: string; resource_id?: number; details?: string };
    const { user_id, action, resource_type, resource_id, details } = body;

    if (!user_id || !action || !resource_type) {
      const response = NextResponse.json({ error: 'Missing required fields: user_id, action, resource_type' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

    await db.prepare(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(user_id, action, resource_type, resource_id || null, details || '{}', ip).run();

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
