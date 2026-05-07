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
    const unreadOnly = searchParams.get('unread_only') === 'true';
    
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [userId];
    
    if (unreadOnly) {
      query += ' AND read = 0';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const results = await db.prepare(query).bind(...params).all();
    const response = NextResponse.json(results.results || []);
    response.headers.set('Cache-Control', 'private, max-age=15');
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
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
    const { user_id, type, title, message, data, expires_at } = await request.json();
    if (!user_id || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields: user_id, type, title, message' }, { status: 400 });
    }
    
    const dataJson = data ? JSON.stringify(data) : null;
    const result = await db.prepare(
      'INSERT INTO notifications (user_id, type, title, message, data, read, created_at, expires_at) VALUES (?, ?, ?, ?, ?, 0, datetime("now"), ?) RETURNING *'
    ).bind(user_id, type, title, message, dataJson, expires_at || null).first();
    
    const response = NextResponse.json(result, { status: 201 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
