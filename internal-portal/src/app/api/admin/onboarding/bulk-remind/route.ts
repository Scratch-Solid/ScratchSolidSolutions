export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getNotificationPreferences, logNotification } from '@/lib/db';
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
    const body = await request.json() as { userIds?: number[]; message?: string };
    const { userIds, message } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'Invalid userIds array' }, { status: 400 }), traceId);
    }

    const results = [];

    for (const userId of userIds) {
      try {
        // Get user info for notification
        const userData = await db.prepare('SELECT name, phone FROM users WHERE id = ?').bind(userId).first();
        if (!userData) {
          results.push({ userId, success: false, error: 'User not found' });
          continue;
        }

        // Get user notification preferences
        const preferences = await getNotificationPreferences(db, userId);

        // Send WhatsApp reminder
        if ((userData as any).phone) {
          const notifyResult = await notifyProfileCreated((userData as any).phone, (userData as any).name, preferences);
          await logNotification(db, {
            user_id: userId,
            phone_number: (userData as any).phone,
            notification_type: 'reminder',
            channel: 'whatsapp',
            template_name: 'reminder',
            status: notifyResult.success ? 'sent' : (notifyResult.skipped ? 'skipped' : 'failed'),
            message_id: notifyResult.messageId,
            error_message: notifyResult.error,
            skip_reason: notifyResult.skipReason,
            metadata: { bulk_remind: true, message, reminded_by: user.userId }
          });

          results.push({ 
            userId, 
            success: notifyResult.success || notifyResult.skipped,
            skipped: notifyResult.skipped,
            skipReason: notifyResult.skipReason
          });
        } else {
          results.push({ userId, success: false, error: 'No phone number' });
        }
      } catch (error) {
        console.error(`Failed to remind user ${userId}:`, error);
        results.push({ userId, success: false, error: String(error) });
      }
    }

    return withSecurityHeaders(NextResponse.json({ results }), traceId);
  } catch (error) {
    console.error('Bulk remind error:', error);
    return withSecurityHeaders(NextResponse.json({ error: `Failed to bulk remind: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
