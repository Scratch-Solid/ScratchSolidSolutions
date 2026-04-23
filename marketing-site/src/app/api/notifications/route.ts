import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const { booking_id, type, message, user_id } = body;

    if (!booking_id || !type || !message || !user_id) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `INSERT INTO notifications (user_id, booking_id, type, message, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', datetime('now')) RETURNING *`
    ).bind(user_id, booking_id, type, message).first();

    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating notification:', error);
    const response = NextResponse.json({ error: 'Notification creation failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let result;
    if (type) {
      result = await db.prepare(
        'SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC'
      ).bind((user as any).id, type).all();
    } else {
      result = await db.prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC'
      ).bind((user as any).id).all();
    }

    const response = NextResponse.json(result.results || []);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    const response = NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
