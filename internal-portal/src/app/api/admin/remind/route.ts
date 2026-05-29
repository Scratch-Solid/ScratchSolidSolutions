export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getNotificationPreferences, logNotification } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing, withCsrf } from '@/lib/middleware';
import { notifyProfileCreated } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const body = await request.json();
    const { userIds, message } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'User IDs required' }, { status: 400 }), traceId);
    }

    const results = [];

    for (const userId of userIds) {
      // Get user info
      const userRecord = await db.prepare('SELECT id, name, phone FROM users WHERE id = ?').bind(userId).first();
      if (!userRecord) {
        results.push({ userId, success: false, error: 'User not found' });
        continue;
      }

      const userData = userRecord as any;
      if (!userData.phone) {
        results.push({ userId, success: false, error: 'User has no phone number' });
        continue;
      }

      // Get notification preferences
      const preferences = await getNotificationPreferences(db, userId);

      // Send reminder
      const notifyResult = await notifyProfileCreated(userData.phone, userData.name, preferences);

      // Log notification
      await logNotification(db, {
        user_id: userId,
        phone_number: userData.phone,
        notification_type: 'reminder',
        channel: 'whatsapp',
        template_name: 'profile_created',
        status: notifyResult.success ? 'sent' : notifyResult.skipped ? 'skipped' : 'failed',
        message_id: notifyResult.messageId,
        error_message: notifyResult.error || notifyResult.skipReason,
        metadata: { message, triggered_by: (user as any).id }
      });

      results.push({
        userId,
        success: notifyResult.success || notifyResult.skipped,
        skipped: notifyResult.skipped,
        error: notifyResult.error || notifyResult.skipReason
      });
    }

    return withSecurityHeaders(NextResponse.json({ results }), traceId);
  } catch (error) {
    console.error('Remind error:', error);
    return withSecurityHeaders(NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 }), traceId);
  }
}
