import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCloudflareContext } from '@/lib/runtime-context';

/**
 * n8n / Zoho → Internal Portal: Payment Status Update
 * Called when a Zoho invoice payment is received (via n8n polling or Zoho webhook).
 * Updates the job's payment_status field.
 *
 * Auth: Bearer token matching INTERNAL_PORTAL_N8N_WEBHOOK_SECRET
 */

interface PaymentWebhookPayload {
  job_id: string;
  zoho_invoice_id: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount_paid_cents?: number;
  payment_date?: string;
  payment_mode?: 'cash' | 'eft' | 'card';
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
    endpoint: '/api/webhooks/n8n/payment-webhook',
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
      console.warn(`[${traceId}] Unauthorized n8n payment-webhook attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Validate input ───
    const body = (await request.json()) as unknown;
    if (
      typeof body !== 'object' ||
      body === null ||
      !('job_id' in body) ||
      !('zoho_invoice_id' in body) ||
      !('payment_status' in body)
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: job_id, zoho_invoice_id, payment_status', traceId },
        { status: 400 }
      );
    }

    const { job_id, zoho_invoice_id, payment_status, amount_paid_cents, payment_date, payment_mode } =
      body as PaymentWebhookPayload;

    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return NextResponse.json(
        { error: 'Invalid payment_status', valid: validStatuses, traceId },
        { status: 400 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database unavailable', traceId },
        { status: 503 }
      );
    }

    // ─── Verify job exists ───
    const job = await db
      .prepare('SELECT id, payment_status FROM jobs WHERE id = ? AND zoho_invoice_id = ?')
      .bind(job_id, zoho_invoice_id)
      .first<{ id: string; payment_status: string }>();

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or invoice mismatch', job_id, zoho_invoice_id, traceId },
        { status: 404 }
      );
    }

    // ─── Update job ───
    await db
      .prepare(
        `UPDATE jobs
         SET payment_status = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(payment_status, job_id)
      .run();

    // ─── Audit log ───
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        0,
        'payment_status_updated',
        'job',
        job_id,
        JSON.stringify({
          previous_status: job.payment_status,
          new_status: payment_status,
          zoho_invoice_id,
          amount_paid_cents,
          payment_date,
          payment_mode,
          trace_id: traceId,
        })
      )
      .run();

    return NextResponse.json(
      {
        job_id,
        zoho_invoice_id,
        previous_status: job.payment_status,
        payment_status,
        traceId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[${traceId}] Payment webhook error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', traceId },
      { status: 500 }
    );
  }
}
