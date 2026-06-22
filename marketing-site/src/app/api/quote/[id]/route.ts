export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRateLimit, rateLimits } from '@/lib/middleware';
import { markEstimateAccepted, createInvoiceFromEstimate } from '@/lib/zoho';

/**
 * PATCH /api/quote/[id]
 * Update a quote request's status by numeric id. Used by the public
 * QuoteModal accept/decline actions.
 *
 * Body: { status: 'accepted' | 'declined' }
 *
 * On 'accepted', best-effort converts the linked Zoho estimate to an invoice
 * (non-blocking — acceptance succeeds even if Zoho is unavailable).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { id } = await params;
  const quoteId = parseInt(id, 10);
  if (!Number.isFinite(quoteId) || quoteId <= 0) {
    return NextResponse.json({ error: 'Invalid quote id' }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const status = body.status;
  if (status !== 'accepted' && status !== 'declined') {
    return NextResponse.json({ error: "status must be 'accepted' or 'declined'" }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const quote = await db.prepare(
      `SELECT id, ref_number, zoho_estimate_id, service_name, final_price, status FROM quote_requests WHERE id = ?`
    ).bind(quoteId).first() as {
      id: number;
      ref_number: string;
      zoho_estimate_id: string | null;
      service_name: string;
      final_price: number;
      status: string;
    } | null;

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status === status) {
      return NextResponse.json({ success: true, id: quote.id, status, ref_number: quote.ref_number });
    }

    let zohoInvoiceId = '';
    let zohoInvoiceNumber = '';

    if (status === 'accepted' && quote.zoho_estimate_id) {
      try {
        await markEstimateAccepted(quote.zoho_estimate_id);
        const invoiceResult = (await createInvoiceFromEstimate(
          quote.zoho_estimate_id,
          [{ name: quote.service_name, rate: quote.final_price, quantity: 1 }]
        )) as { invoice?: { invoice_id: string; invoice_number: string } };
        if (invoiceResult.invoice) {
          zohoInvoiceId = invoiceResult.invoice.invoice_id;
          zohoInvoiceNumber = invoiceResult.invoice.invoice_number;
        }
      } catch (zohoError) {
        console.error('Zoho step failed during quote acceptance (non-blocking):', zohoError);
      }
    }

    if (zohoInvoiceId) {
      await db.prepare(
        `UPDATE quote_requests SET status = ?, zoho_invoice_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(status, zohoInvoiceId, quoteId).run();
    } else {
      await db.prepare(
        `UPDATE quote_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(status, quoteId).run();
    }

    return NextResponse.json({
      success: true,
      id: quote.id,
      ref_number: quote.ref_number,
      status,
      zoho_invoice_number: zohoInvoiceNumber,
    });
  } catch (error) {
    console.error('Quote status update error:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
