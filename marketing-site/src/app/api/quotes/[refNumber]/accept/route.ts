export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withRateLimit, rateLimits } from '@/lib/middleware';
import { markEstimateAccepted, createInvoice, createEstimate } from '@/lib/zoho';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ refNumber: string }> }
) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { refNumber } = await params;

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get quote request details
    const quote = await db.prepare(
      `SELECT * FROM quote_requests WHERE ref_number = ?`
    ).bind(refNumber).first() as {
      id: number;
      zoho_estimate_id: string;
      email: string;
      name: string;
      phone: string;
      service_name: string;
      final_price: number;
      status: string;
    } | null;

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status === 'accepted') {
      return NextResponse.json({ error: 'Quote already accepted' }, { status: 400 });
    }

    // Mark Zoho estimate as accepted
    if (quote.zoho_estimate_id) {
      try {
        await markEstimateAccepted(quote.zoho_estimate_id);
      } catch (zohoError) {
        console.error('Failed to mark Zoho estimate as accepted:', zohoError);
        // Continue - quote acceptance succeeds even if Zoho fails
      }
    }

    // Convert estimate to invoice in Zoho
    let zohoInvoiceId = '';
    let zohoInvoiceNumber = '';
    if (quote.zoho_estimate_id) {
      try {
        // Get estimate details from Zoho to create invoice
        const invoiceResult = await createInvoice(
          quote.zoho_estimate_id,
          [{
            name: quote.service_name,
            rate: quote.final_price,
            quantity: 1,
          }]
        ) as { invoice?: { invoice_id: string; invoice_number: string } };
        
        if (invoiceResult.invoice) {
          zohoInvoiceId = invoiceResult.invoice.invoice_id;
          zohoInvoiceNumber = invoiceResult.invoice.invoice_number;
        }
      } catch (zohoError) {
        console.error('Failed to create Zoho invoice:', zohoError);
        // Continue - quote acceptance succeeds even if Zoho fails
      }
    }

    // Update quote request status and store invoice info
    await db.prepare(
      `UPDATE quote_requests 
       SET status = 'accepted', 
           zoho_invoice_id = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(zohoInvoiceId, quote.id).run();

    return NextResponse.json({
      success: true,
      ref_number: refNumber,
      zoho_invoice_number: zohoInvoiceNumber,
      status: 'accepted',
    });

  } catch (error) {
    console.error('Quote acceptance error:', error);
    return NextResponse.json(
      { error: 'Failed to accept quote' },
      { status: 500 }
    );
  }
}
