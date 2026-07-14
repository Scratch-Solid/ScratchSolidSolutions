export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, updateUserOnboardingStage, logOnboardingTransition, logNotification, getNotificationPreferences } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing, withCsrf } from '@/lib/middleware';
import { notifyAdminApproved } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const body = await request.json() as { userIds?: number[] };
    const { userIds } = body;

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

        // Update user onboarding stage to consent_approved
        await updateUserOnboardingStage(db, userId, 'consent_approved');

        // Log the stage transition
        await logOnboardingTransition(db, {
          user_id: userId,
          from_stage: 'consent_pending',
          to_stage: 'consent_approved',
          event_type: 'bulk_approve',
          metadata: { approved_by: user.userId },
          ip_address: request.headers.get('x-forwarded-for') || undefined,
          user_agent: request.headers.get('user-agent') || undefined
        });

        // Send WhatsApp notification
        const preferences = await getNotificationPreferences(db, userId);
        if ((userData as any).phone) {
          const notifyResult = await notifyAdminApproved((userData as any).phone, (userData as any).name, preferences, db);
          await logNotification(db, {
            user_id: userId,
            phone_number: (userData as any).phone,
            notification_type: 'admin_approved',
            channel: 'whatsapp',
            template_name: 'admin_approved',
            status: notifyResult.success ? 'sent' : (notifyResult.skipped ? 'skipped' : 'failed'),
            message_id: notifyResult.messageId,
            error_message: notifyResult.error,
            skip_reason: notifyResult.skipReason,
            metadata: { bulk_approve: true, approved_by: user.userId }
          });
        }

        results.push({ userId, success: true });
      } catch (error) {
        console.error(`Failed to approve user ${userId}:`, error);
        results.push({ userId, success: false, error: String(error) });
      }
    }

    return withSecurityHeaders(NextResponse.json({ results }), traceId);
  } catch (error) {
    console.error('Bulk approve error:', error);
    return withSecurityHeaders(NextResponse.json({ error: `Failed to bulk approve: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
