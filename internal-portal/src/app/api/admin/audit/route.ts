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
    const admin_id = searchParams.get('admin_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    let query = `
      SELECT al.*, u.name as admin_name, u.email as admin_email
      FROM audit_logs al
      JOIN users u ON al.admin_id = u.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (admin_id) {
      conditions.push('al.admin_id = ?');
      params.push(admin_id);
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
    if (admin_id) {
      countQuery += ' WHERE al.admin_id = ?';
      countParams.push(admin_id);
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
    const response = NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { admin_id?: number; action?: string; resource_type?: string; resource_id?: number; details?: string };
    const { admin_id, action, resource_type, resource_id, details } = body;

    if (!admin_id || !action || !resource_type) {
      return NextResponse.json({ error: 'Missing required fields: admin_id, action, resource_type' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

    await db.prepare(
      'INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(admin_id, action, resource_type, resource_id || null, details || '{}', ip).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}
