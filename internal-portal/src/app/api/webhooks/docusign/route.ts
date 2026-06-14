/**
 * DocuSign Connect Webhook
 * Handles envelope status changes (sent, delivered, completed, declined, voided).
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { log } from '@/lib/logger';
import { getEnvVarOptional } from '@/lib/env';

function verifyConnectSignature(body: string, signature: string | null): boolean {
  // DocuSign Connect HMAC signature verification
  // In production, compute HMAC-SHA256 with the Connect secret and compare
  const secret = getEnvVarOptional('DOCUSIGN_CONNECT_SECRET');
  if (!secret) {
    log.warn('DOCUSIGN_CONNECT_SECRET not configured; skipping HMAC verification');
    return true;
  }
  if (!signature) return false;
  // TODO: implement HMAC verification if Connect secret is provided
  return true;
}

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    const signature = request.headers.get('x-docusign-signature-1');
    const bodyText = await request.text();

    if (!verifyConnectSignature(bodyText, signature)) {
      log.warn('DocuSign Connect signature verification failed', { traceId });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const envelope = JSON.parse(bodyText);
    const status = envelope.status;
    const envelopeId = envelope.envelopeId;

    if (!envelopeId) {
      return NextResponse.json({ error: 'Missing envelopeId' }, { status: 400 });
    }

    log.audit('DOCUSIGN_WEBHOOK_RECEIVED', 'cleaner_onboarding', {
      traceId,
      envelopeId,
      status,
      event: envelope.event,
    });

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    if (status === 'completed') {
      // Find the training_progress record with this envelope ID
      const progress = await db.prepare(
        'SELECT employee_id, user_id FROM training_progress WHERE contract_signature_id = ?'
      ).bind(envelopeId).first() as { employee_id?: string; user_id?: number } | null;

      if (progress?.employee_id) {
        await db.prepare(
          `UPDATE training_progress
           SET contract_signed = 1, contract_signed_at = datetime('now'), updated_at = datetime('now')
           WHERE contract_signature_id = ?`
        ).bind(envelopeId).run();

        if (progress.user_id) {
          await db.prepare(
            `UPDATE staff SET onboarding_stage = 'contract_signed' WHERE user_id = ?`
          ).bind(progress.user_id).run();

          await db.prepare(
            `INSERT INTO onboarding_audit (user_id, from_stage, to_stage, event_type, metadata, ip_address, user_agent, created_at)
             VALUES (?, 'contract_sent', 'contract_signed', 'docusign_webhook', ?, 'docusign', 'connect', datetime('now'))`
          ).bind(
            progress.user_id,
            JSON.stringify({ envelope_id: envelopeId, status, event: envelope.event })
          ).run();
        }
      }

      log.audit('DOCUSIGN_CONTRACT_COMPLETED', 'cleaner_onboarding', {
        traceId,
        envelopeId,
        employeeId: progress?.employee_id,
        userId: progress?.user_id,
      });
    }

    if (status === 'declined' || status === 'voided') {
      const progress = await db.prepare(
        'SELECT employee_id, user_id FROM training_progress WHERE contract_signature_id = ?'
      ).bind(envelopeId).first() as { employee_id?: string; user_id?: number } | null;

      log.audit('DOCUSIGN_CONTRACT_DECLINED', 'cleaner_onboarding', {
        traceId,
        envelopeId,
        employeeId: progress?.employee_id,
        userId: progress?.user_id,
        status,
      });
    }

    return NextResponse.json({ received: true, envelopeId, status });
  } catch (error) {
    log.error('DOCUSIGN_WEBHOOK_ERROR', error instanceof Error ? error : new Error(String(error)), { traceId });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
