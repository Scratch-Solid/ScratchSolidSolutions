import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getEstimatePdf } from '@/lib/zoho';

// GET /api/quote/[id] — fetch a single quote by id or ref_number
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    const { id } = await params;

    // Check if requesting PDF
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // Look up by numeric id or ref_number
    const isNumeric = /^\d+$/.test(id);
    const quote = await db.prepare(
      isNumeric
        ? `SELECT * FROM quote_requests WHERE id = ?`
        : `SELECT * FROM quote_requests WHERE ref_number = ?`
    ).bind(id).first() as Record<string, unknown> | null;

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // If PDF requested and Zoho estimate exists, proxy the PDF
    if (format === 'pdf' && quote.zoho_estimate_id) {
      try {
        const pdfResponse = await getEstimatePdf(quote.zoho_estimate_id as string);
        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="Quote-${quote.ref_number}.pdf"`,
            },
          });
        }
      } catch (pdfErr) {
        console.error('Zoho PDF fetch failed:', pdfErr);
        // Fall through to return JSON — client will use browser print
      }
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

// Admin PATCH: update quote status or notes
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as { status?: string; notes?: string; final_price?: number };
    const { status, notes, final_price } = body;

    const validStatuses = ['pending', 'sent', 'accepted', 'declined'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const result = await db.prepare(
      `UPDATE quote_requests SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        final_price = COALESCE(?, final_price),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(status ?? null, notes ?? null, final_price ?? null, id).run();

    if (result.meta.rows_written === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
