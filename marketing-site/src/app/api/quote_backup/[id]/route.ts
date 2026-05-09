import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getEstimatePdf, markEstimateAccepted } from '@/lib/zoho';

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

// PATCH: update quote
// Public: may only set status to 'accepted' or 'declined'
// Admin (Bearer): may set any status, notes, or final_price
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    const { id } = await params;
    const body = await request.json() as { status?: string; notes?: string; final_price?: number };
    const { status, notes, final_price } = body;

    const isAdmin = request.headers.get('Authorization')?.startsWith('Bearer ');
    const publicStatuses = ['accepted', 'declined'];
    const allStatuses = ['pending', 'sent', 'accepted', 'declined'];

    if (!isAdmin) {
      // Public callers: only allowed to accept or decline
      if (!status || !publicStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'You may only set status to accepted or declined' },
          { status: 403 }
        );
      }
      if (notes !== undefined || final_price !== undefined) {
        return NextResponse.json({ error: 'Unauthorized to edit notes or price' }, { status: 403 });
      }
    } else {
      // Admin: validate status value
      if (status && !allStatuses.includes(status)) {
        return NextResponse.json({ error: `status must be one of: ${allStatuses.join(', ')}` }, { status: 400 });
      }
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

    // When client accepts: mark the Zoho estimate as accepted (best-effort)
    if (status === 'accepted') {
      try {
        const freshQuote = await db.prepare(
          `SELECT zoho_estimate_id FROM quote_requests WHERE id = ?`
        ).bind(id).first() as { zoho_estimate_id?: string } | null;
        if (freshQuote?.zoho_estimate_id) {
          await markEstimateAccepted(freshQuote.zoho_estimate_id);
        }
      } catch (zohoErr) {
        console.error('Zoho mark-accepted failed (non-fatal):', zohoErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
