import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      user_id?: number;
      subscription?: {
        endpoint: string;
        keys?: {
          p256dh: string;
          auth: string;
        };
      };
    };
    const { subscription } = body;
    const userId = (user as any).id;

    if (!subscription || !subscription.endpoint) {
      const response = NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Check if subscription already exists
    const existing = await db.prepare(
      'SELECT * FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
    ).bind(userId, subscription.endpoint).first();

    if (!existing) {
      // Store new subscription
      await db.prepare(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind(
        userId,
        subscription.endpoint,
        subscription.keys?.p256dh || '',
        subscription.keys?.auth || ''
      ).run();
    }

    logger.info(`Push subscription registered for user ${userId}`, { userId, endpoint: subscription.endpoint });

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error registering push subscription', error as Error);
    const response = NextResponse.json({ error: 'Failed to register subscription' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
