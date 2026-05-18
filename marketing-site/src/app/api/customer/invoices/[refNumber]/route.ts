export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withRateLimit, rateLimits } from '@/lib/middleware';
import { getInvoicePdf, getInvoiceStatus } from '@/lib/zoho';
import jwt from 'jsonwebtoken';
import { getJWTSecret } from '@/lib/env';

export async function GET(
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

    // Get quote request with invoice details
    const quote = await db.prepare(
      `SELECT * FROM quote_requests WHERE ref_number = ?`
    ).bind(refNumber).first() as {
      id: number;
      zoho_invoice_id: string;
      email: string;
      status: string;
    } | null;

    if (!quote) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!quote.zoho_invoice_id) {
      return NextResponse.json({ error: 'Invoice not yet generated' }, { status: 404 });
    }

    // Get invoice status from Zoho
    let invoiceStatus = 'unknown';
    try {
      const statusResult = await getInvoiceStatus(quote.zoho_invoice_id) as { invoice?: { status: string } };
      if (statusResult.invoice) {
        invoiceStatus = statusResult.invoice.status;
      }
    } catch (zohoError) {
      console.error('Failed to get invoice status:', zohoError);
    }

    // Get invoice PDF from Zoho
    try {
      const zohoPdf = await getInvoicePdf(quote.zoho_invoice_id);
      const pdfBuffer = await zohoPdf.arrayBuffer();
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Invoice-${refNumber}.pdf"`,
        },
      });
    } catch (zohoError) {
      console.error('Zoho PDF fetch failed:', zohoError);
      return NextResponse.json(
        { error: 'Failed to retrieve invoice PDF' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Invoice download error:', error);
    return NextResponse.json(
      { error: 'Failed to download invoice' },
      { status: 500 }
    );
  }
}
