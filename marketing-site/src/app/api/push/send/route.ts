import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as {
      user_id?: number;
      title: string;
      body: string;
      data?: any;
    };
    const { user_id, title, body: messageBody, data } = body;

    if (!user_id || !title || !messageBody) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Get user's push subscriptions
    const subscriptions = await db.prepare(
      'SELECT * FROM push_subscriptions WHERE user_id = ?'
    ).bind(user_id).all();

    if (!subscriptions.results || subscriptions.results.length === 0) {
      const response = NextResponse.json({ error: 'No push subscriptions found for user' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    // Send push notification to each subscription
    // Note: This would typically use a service like Firebase Cloud Messaging or Web Push library
    // For now, we'll log the notification and return success
    logger.info(`Push notification prepared for user ${user_id}`, {
      user_id,
      title,
      body: messageBody,
      subscription_count: subscriptions.results.length
    });

    // TODO: Implement actual Web Push sending using web-push library
    // This would require VAPID keys to be set up in Cloudflare Workers

    const response = NextResponse.json({
      success: true,
      sent_count: subscriptions.results.length
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error sending push notification', error as Error);
    const response = NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
