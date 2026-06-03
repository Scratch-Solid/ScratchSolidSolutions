import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sendWhatsAppMessage, sendWhatsAppTemplate, isConversationWindowOpen } from '@/lib/whatsapp/meta-cloud';
import { sendEmail } from '@/lib/notifications';

/**
 * n8n → Internal Portal: Send WhatsApp Message (with email fallback)
 * Triggered by n8n when a client/cleaner notification needs to be sent.
 *
 * Auth: Bearer token matching INTERNAL_PORTAL_N8N_WEBHOOK_SECRET
 */

interface SendWhatsAppPayload {
  phone: string;
  message: string;
  template_name?: string;
  language_code?: string;
  fallback_email?: string;
  fallback_subject?: string;
  job_id?: string;
}

function generateTraceId(): string {
  if (typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/n8n/send-whatsapp',
    method: 'POST',
    auth: 'Bearer token',
  });
}

export async function POST(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    // ─── Auth ───
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const expectedSecret = env?.INTERNAL_PORTAL_N8N_WEBHOOK_SECRET;

    if (!expectedSecret || token !== expectedSecret) {
      console.warn(`[${traceId}] Unauthorized n8n send-whatsapp attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Validate input ───
    const body = (await request.json()) as unknown;
    if (
      typeof body !== 'object' ||
      body === null ||
      !('phone' in body) ||
      !('message' in body)
    ) {
      return NextResponse.json(
        { error: 'Missing phone or message', traceId },
        { status: 400 }
      );
    }

    const {
      phone,
      message,
      template_name,
      language_code = 'en',
      fallback_email,
      fallback_subject = 'Scratch Solid Notification',
      job_id,
    } = body as SendWhatsAppPayload;

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database unavailable', traceId },
        { status: 503 }
      );
    }

    // ─── Check conversation window ───
    const windowOpen = await isConversationWindowOpen(db, phone);

    let waResult: { success: boolean; messageId?: string; error?: string };

    if (windowOpen) {
      // Send free-form message
      waResult = await sendWhatsAppMessage(phone, message);
    } else {
      // Window closed: use template (if provided) or skip
      if (template_name) {
        waResult = await sendWhatsAppTemplate(phone, template_name, language_code);
      } else {
        waResult = {
          success: false,
          error: 'Conversation window closed and no template provided',
        };
      }
    }

    // ─── Email fallback ───
    let emailResult: { success: boolean; error?: string } = { success: false };
    if (!waResult.success && fallback_email) {
      try {
        await sendEmail({
          to: fallback_email,
          subject: fallback_subject,
          body: `${message}\n\n---\nYou received this email because a WhatsApp message could not be delivered (window closed or API error).`,
          html: `<p>${message.replace(/\n/g, '<br>')}</p><hr><p><small>You received this email because a WhatsApp message could not be delivered (window closed or API error).</small></p>`,
        });
        emailResult = { success: true };
      } catch (e) {
        emailResult = { success: false, error: e instanceof Error ? e.message : 'Email send failed' };
      }
    }

    // ─── Audit log ───
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        0,
        'whatsapp_sent',
        'notification',
        job_id || '',
        JSON.stringify({
          phone,
          message,
          template_name,
          window_open: windowOpen,
          whatsapp_result: waResult,
          email_fallback: emailResult,
          trace_id: traceId,
        })
      )
      .run();

    return NextResponse.json(
      {
        traceId,
        phone,
        window_open: windowOpen,
        whatsapp: waResult,
        email_fallback: emailResult,
        delivered: waResult.success || emailResult.success,
      },
      { status: waResult.success || emailResult.success ? 200 : 502 }
    );
  } catch (error) {
    console.error(`[${traceId}] Send WhatsApp error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', traceId },
      { status: 500 }
    );
  }
}
