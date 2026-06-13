import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCloudflareContext } from '@/lib/runtime-context';
import { findCustomerByEmail, createCustomer, createInvoice } from '@/lib/zoho';

/**
 * n8n → Internal Portal: Create Zoho Invoice for a Job
 * Triggered by n8n after booking ingestion (or on job completion).
 * Creates Zoho customer if not exists, then creates invoice.
 *
 * Auth: Bearer token matching INTERNAL_PORTAL_N8N_WEBHOOK_SECRET
 */

interface CreateInvoicePayload {
  job_id: string;
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
    endpoint: '/api/webhooks/n8n/create-invoice',
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
      console.warn(`[${traceId}] Unauthorized n8n create-invoice attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Validate input ───
    const body = (await request.json()) as unknown;
    if (typeof body !== 'object' || body === null || !('job_id' in body)) {
      return NextResponse.json(
        { error: 'Missing job_id', traceId },
        { status: 400 }
      );
    }
    const { job_id } = body as CreateInvoicePayload;

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database unavailable', traceId },
        { status: 503 }
      );
    }

    // ─── Fetch job ───
    const job = await db
      .prepare(
        `SELECT id, client_name, client_email, client_phone, property_address, service_type, status, scheduled_at
         FROM jobs WHERE id = ?`
      )
      .bind(job_id)
      .first<{
        id: string;
        client_name: string;
        client_email: string;
        client_phone: string;
        property_address: string;
        service_type: string;
        status: string;
        scheduled_at: string;
      }>();

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', job_id, traceId },
        { status: 404 }
      );
    }

    // ─── Fetch pricing ───
    const pricing = await db
      .prepare(
        `SELECT base_price, transport_fee, weekend_surcharge, holiday_surcharge
         FROM pricing_config WHERE service_type = ? AND (is_active = 1 OR is_active IS NULL)`
      )
      .bind(job.service_type)
      .first<{
        base_price: number;
        transport_fee: number;
        weekend_surcharge: number;
        holiday_surcharge: number;
      }>();

    if (!pricing) {
      return NextResponse.json(
        { error: 'Pricing not found for service type', service_type: job.service_type, traceId },
        { status: 400 }
      );
    }

    // ─── Calculate total ───
    const scheduledAt = new Date(job.scheduled_at);
    const isWeekend = scheduledAt.getDay() === 0 || scheduledAt.getDay() === 6;
    const lineItems = [
      {
        name: 'Cleaning Service',
        description: `${job.service_type} — ${job.property_address}`,
        rate: pricing.base_price,
        quantity: 1,
      },
    ];
    if (pricing.transport_fee > 0) {
      lineItems.push({
        name: 'Transport Fee',
        description: 'Travel to site',
        rate: pricing.transport_fee,
        quantity: 1,
      });
    }

    let totalAmount = pricing.base_price + (pricing.transport_fee || 0);
    if (isWeekend && pricing.weekend_surcharge > 0) {
      totalAmount += pricing.weekend_surcharge;
      lineItems.push({
        name: 'Weekend Surcharge',
        description: 'Weekend service premium',
        rate: pricing.weekend_surcharge,
        quantity: 1,
      });
    }
    const totalAmountCents = Math.round(totalAmount * 100);

    // ─── Find or create Zoho customer ───
    let customer = await findCustomerByEmail(job.client_email);
    let customerId: string;

    if (!customer) {
      const createResult = await createCustomer(
        job.client_name,
        job.client_email,
        job.client_phone,
        job.property_address
      );
      if (!createResult.contact?.contact_id) {
        return NextResponse.json(
          { error: 'Failed to create Zoho customer', zoho_error: createResult, traceId },
          { status: 502 }
        );
      }
      customerId = createResult.contact.contact_id;
    } else {
      customerId = customer.contact_id;
    }

    // ─── Create Zoho invoice ───
    const invoiceResult = await createInvoice(customerId, lineItems, {
      reference: job.id,
      notes: `ScratchSolid job ${job.id}`,
    });

    if (!invoiceResult.invoice?.invoice_id) {
      return NextResponse.json(
        { error: 'Failed to create Zoho invoice', zoho_error: invoiceResult, traceId },
        { status: 502 }
      );
    }

    const invoiceId = invoiceResult.invoice.invoice_id;

    // ─── Update job record ───
    await db
      .prepare(
        `UPDATE jobs
         SET zoho_invoice_id = ?, zoho_customer_id = ?, total_amount_cents = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(invoiceId, customerId, totalAmountCents, job_id)
      .run();

    // ─── Audit log ───
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        0,
        'invoice_created',
        'job',
        job_id,
        JSON.stringify({
          zoho_invoice_id: invoiceId,
          zoho_customer_id: customerId,
          total_amount_cents: totalAmountCents,
          customer_created: !customer,
          trace_id: traceId,
        })
      )
      .run();

    return NextResponse.json(
      {
        job_id,
        zoho_invoice_id: invoiceId,
        zoho_customer_id: customerId,
        total_amount_cents: totalAmountCents,
        total_amount_zar: (totalAmountCents / 100).toFixed(2),
        customer_created: !customer,
        traceId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[${traceId}] Create invoice error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', traceId },
      { status: 500 }
    );
  }
}
