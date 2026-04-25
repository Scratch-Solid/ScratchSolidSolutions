import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { validateString, validateNumber } from '@/lib/validation';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many notification requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      booking_id?: number;
      type?: string;
      message?: string;
      user_id?: number;
    };
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
    logger.error('Error creating notification', error as Error);
    const response = NextResponse.json({ error: 'Notification creation failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many notification requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

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
    logger.error('Error fetching notifications', error as Error);
    const response = NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
