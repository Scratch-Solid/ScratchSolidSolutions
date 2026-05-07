import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const notificationId = params.id;
    const { read } = await request.json();
    
    const result = await db.prepare(
      'UPDATE notifications SET read = ? WHERE id = ? AND user_id = ? RETURNING *'
    ).bind(read ? 1 : 0, notificationId, (user as any).userId).first();
    
    if (!result) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    const response = NextResponse.json(result);
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const notificationId = params.id;
    
    const result = await db.prepare(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?'
    ).bind(notificationId, (user as any).userId).run();
    
    if (result.meta.changes === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    const response = new NextResponse(null, { status: 204 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
