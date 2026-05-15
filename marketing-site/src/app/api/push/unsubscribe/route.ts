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

    // Delete subscription
    await db.prepare(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
    ).bind(userId, subscription.endpoint).run();

    logger.info(`Push subscription removed for user ${userId}`, { userId, endpoint: subscription.endpoint });

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error removing push subscription', error as Error);
    const response = NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
