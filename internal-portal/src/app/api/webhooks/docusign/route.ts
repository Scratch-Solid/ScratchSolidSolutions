/**
 * DocuSign Connect Webhook
 * Handles envelope status changes (sent, delivered, completed, declined, voided).
 * Configure in DocuSign Admin → Connect → Add Configuration:
 *   URL: https://portal.scratchsolidsolutions.org/api/webhooks/docusign
 *   Format: XML (handled) or RESTv21+ JSON
 *   Include: Envelope Status, Recipient Status
 *   Enable: Require Acknowledgement
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { log } from '@/lib/logger';
import { getEnvVarOptional } from '@/lib/env';

async function verifyHmacSha256(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return computed === signature.toLowerCase();
}

function verifyConnectSignature(body: string, signature: string | null): Promise<boolean> {
  const secret = getEnvVarOptional('DOCUSIGN_CONNECT_SECRET');
  if (!secret) {
    log.warn('DOCUSIGN_CONNECT_SECRET not configured; skipping HMAC verification');
    return Promise.resolve(true);
  }
  return verifyHmacSha256(body, signature, secret);
}

function extractXmlValue(xml: string, tag: string): string | null {
  const open = `<${tag}[^>]*>`;
  const close = `</${tag}>`;
  const regex = new RegExp(`${open}([^<]*)${close}`, 'i');
  const match = xml.match(regex);
  return match?.[1]?.trim() || null;
}

function parseDocusignPayload(bodyText: string): {
  envelopeId: string | null;
  status: string | null;
  event: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  signedDateTime: string | null;
} {
  const trimmed = bodyText.trim();

  // Try JSON first (RESTv21+ JSON format)
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      return {
        envelopeId: json.envelopeId || json.EnvelopeID || null,
        status: json.status || json.Status || null,
        event: json.event || json.Event || null,
        recipientEmail: json.recipient?.email || json.email || null,
        recipientName: json.recipient?.name || json.name || null,
        signedDateTime: json.signedDateTime || null,
      };
    } catch {
      // Fall through to XML parsing
    }
  }

  // XML parsing (DocuSign Connect default XML format)
  return {
    envelopeId:
      extractXmlValue(trimmed, 'EnvelopeID') ||
      extractXmlValue(trimmed, 'EnvelopeId') ||
      extractXmlValue(trimmed, 'envelopeId') ||
      null,
    status:
      extractXmlValue(trimmed, 'Status') ||
      extractXmlValue(trimmed, 'status') ||
      null,
    event:
      extractXmlValue(trimmed, 'Event') ||
      extractXmlValue(trimmed, 'event') ||
      null,
    recipientEmail:
      extractXmlValue(trimmed, 'Email') ||
      extractXmlValue(trimmed, 'email') ||
      null,
    recipientName:
      extractXmlValue(trimmed, 'UserName') ||
      extractXmlValue(trimmed, 'userName') ||
      extractXmlValue(trimmed, 'name') ||
      null,
    signedDateTime:
      extractXmlValue(trimmed, 'SignedDateTime') ||
      extractXmlValue(trimmed, 'signedDateTime') ||
      null,
  };
}

/**
 * GET — DocuSign Connect validation ping
 * DocuSign sends a GET when validating the webhook URL.
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/docusign',
    message: 'DocuSign Connect webhook active',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const signature = request.headers.get('x-docusign-signature-1');
    const bodyText = await request.text();

    const sigValid = await verifyConnectSignature(bodyText, signature);
    if (!sigValid) {
      log.warn('DocuSign Connect signature verification failed', { traceId });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = parseDocusignPayload(bodyText);
    const { envelopeId, status, event } = payload;

    if (!envelopeId) {
      return NextResponse.json({ error: 'Missing envelopeId' }, { status: 400 });
    }

    log.audit('DOCUSIGN_WEBHOOK_RECEIVED', 'cleaner_onboarding', {
      traceId,
      envelopeId,
      status,
      event,
    });

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const normalizedStatus = status?.toLowerCase() || '';

    if (normalizedStatus === 'completed') {
      // Look up by envelope ID in multiple tables
      const progress = await db.prepare(
        'SELECT employee_id, user_id, contract_signed FROM training_progress WHERE contract_signature_id = ?'
      ).bind(envelopeId).first() as { employee_id?: string; user_id?: number; contract_signed?: number } | null;

      const consentProgress = await db.prepare(
        'SELECT employee_id, user_id, background_check_consent FROM training_progress WHERE consent_signature_id = ?'
      ).bind(envelopeId).first() as { employee_id?: string; user_id?: number; background_check_consent?: number } | null;

      const newJoiner = await db.prepare(
        'SELECT id, user_id, status FROM new_joiners WHERE contract_signature_id = ? OR consent_signature_id = ?'
      ).bind(envelopeId, envelopeId).first() as { id?: number; user_id?: number; status?: string } | null;

      const targetUserId = progress?.user_id ?? consentProgress?.user_id ?? newJoiner?.user_id ?? null;
      const employeeId = progress?.employee_id ?? consentProgress?.employee_id ?? null;

      if (progress?.employee_id && !progress.contract_signed) {
        await db.prepare(
          `UPDATE training_progress
           SET contract_signed = 1, contract_signed_at = datetime('now'), updated_at = datetime('now')
           WHERE contract_signature_id = ?`
        ).bind(envelopeId).run();
      }

      if (consentProgress?.employee_id && !consentProgress.background_check_consent) {
        await db.prepare(
          `UPDATE training_progress
           SET background_check_consent = 1, background_check_consent_at = datetime('now'), updated_at = datetime('now')
           WHERE consent_signature_id = ?`
        ).bind(envelopeId).run();
      }

      if (targetUserId) {
        await db.prepare(
          `UPDATE staff SET onboarding_stage = 'contract_signed', updated_at = datetime('now') WHERE user_id = ?`
        ).bind(targetUserId).run();

        await db.prepare(
          `UPDATE users SET onboarding_stage = 'contract_signed', updated_at = datetime('now') WHERE id = ?`
        ).bind(targetUserId).run();

        await db.prepare(
          `INSERT INTO onboarding_audit (user_id, from_stage, to_stage, event_type, metadata, ip_address, user_agent, created_at)
           VALUES (?, 'contract_sent', 'contract_signed', 'docusign_webhook', ?, 'docusign', 'connect', datetime('now'))`
        ).bind(
          targetUserId,
          JSON.stringify({ envelope_id: envelopeId, status, event, employee_id: employeeId })
        ).run().catch(() => {
          // onboarding_audit may not exist yet; ignore
        });
      }

      if (newJoiner?.id) {
        await db.prepare(
          `UPDATE new_joiners SET status = 'approved', updated_at = datetime('now') WHERE id = ?`
        ).bind(newJoiner.id).run();
      }

      log.audit('DOCUSIGN_CONTRACT_COMPLETED', 'cleaner_onboarding', {
        traceId,
        envelopeId,
        employeeId,
        userId: targetUserId != null ? String(targetUserId) : null,
      });
    }

    if (normalizedStatus === 'declined' || normalizedStatus === 'voided') {
      const progress = await db.prepare(
        'SELECT employee_id, user_id FROM training_progress WHERE contract_signature_id = ? OR consent_signature_id = ?'
      ).bind(envelopeId, envelopeId).first() as { employee_id?: string; user_id?: number } | null;

      const newJoiner = await db.prepare(
        'SELECT id, user_id FROM new_joiners WHERE contract_signature_id = ? OR consent_signature_id = ?'
      ).bind(envelopeId, envelopeId).first() as { id?: number; user_id?: number } | null;

      const targetUserId = progress?.user_id ?? newJoiner?.user_id ?? null;

      if (targetUserId) {
        await db.prepare(
          `UPDATE staff SET onboarding_stage = 'contract_declined', updated_at = datetime('now') WHERE user_id = ?`
        ).bind(targetUserId).run().catch(() => {});

        await db.prepare(
          `UPDATE users SET onboarding_stage = 'contract_declined', updated_at = datetime('now') WHERE id = ?`
        ).bind(targetUserId).run().catch(() => {});
      }

      log.audit('DOCUSIGN_CONTRACT_DECLINED', 'cleaner_onboarding', {
        traceId,
        envelopeId,
        employeeId: progress?.employee_id,
        userId: targetUserId != null ? String(targetUserId) : null,
        status,
      });
    }

    return NextResponse.json({ received: true, envelopeId, status });
  } catch (error) {
    log.error('DOCUSIGN_WEBHOOK_ERROR', error instanceof Error ? error : new Error(String(error)), { traceId });
    return NextResponse.json({ error: 'Internal error', traceId }, { status: 500 });
  }
}
