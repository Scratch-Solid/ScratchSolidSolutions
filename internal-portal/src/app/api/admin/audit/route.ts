import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const admin_id = searchParams.get('admin_id');
    const limit = parseInt(searchParams.get('limit') || '100');

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

    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(limit);

    const logs = await db.prepare(query).bind(...params).all();
    return NextResponse.json(logs.results || []);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
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
