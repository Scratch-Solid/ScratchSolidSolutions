import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    const user = await db.prepare('SELECT id, email, role, name, phone, address, business_name FROM users WHERE id = ?').bind(id).first();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const response = NextResponse.json(user);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching user:', error);
    const response = NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'business']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    await db.prepare('UPDATE users SET deleted = 1 WHERE id = ?').bind(id).run();
    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error deleting user:', error);
    const response = NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
