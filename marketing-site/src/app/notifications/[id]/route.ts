import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const notification = await db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').bind(parseInt(params.id), (user as any).id).first();
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const result = await db.prepare(
      'UPDATE notifications SET read = 1 WHERE id = ? RETURNING *'
    ).bind(parseInt(params.id)).first();

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating notification', error as Error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const notification = await db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').bind(parseInt(params.id), (user as any).id).first();
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await db.prepare('DELETE FROM notifications WHERE id = ?').bind(parseInt(params.id)).run();
    return NextResponse.json({ message: 'Notification deleted' });
  } catch (error) {
    logger.error('Error deleting notification', error as Error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
