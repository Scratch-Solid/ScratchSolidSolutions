export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withRateLimit, rateLimits } from '@/lib/middleware';
import { getInvoicePdf } from '@/lib/zoho';

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

  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  const { refNumber } = await params;

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

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

    const userEmail = (user as any).email?.toLowerCase() || '';
    if (quote.email?.toLowerCase() !== userEmail && (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!quote.zoho_invoice_id) {
      return NextResponse.json({ error: 'Invoice not yet generated' }, { status: 404 });
    }

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
        { error: `Failed to retrieve invoice PDF: ${zohoError instanceof Error ? zohoError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Invoice download error:', error);
    return NextResponse.json(
      { error: `Failed to download invoice: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
