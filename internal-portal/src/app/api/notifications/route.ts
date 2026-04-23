import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || (user as any).userId;
    const results = await db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(userId).all();
    const response = NextResponse.json(results.results || []);
    response.headers.set('Cache-Control', 'private, max-age=15');
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    const response = NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { user_id, channel, message } = await request.json();
    if (!user_id || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await db.prepare(
      'INSERT INTO notifications (user_id, type, message, status, created_at) VALUES (?, ?, ?, ?, datetime("now")) RETURNING *'
    ).bind(user_id, channel || 'in_app', message, 'unread').first();
    const response = NextResponse.json(result, { status: 201 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating notification:', error);
    const response = NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
