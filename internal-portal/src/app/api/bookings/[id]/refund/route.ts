export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withRateLimit, withCsrf, withSecurityHeaders, withTracing } from '@/lib/middleware';
import { createCreditNote, applyCreditNoteToInvoice } from '@/lib/zoho';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  // Rate limiting
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await params;

  try {
    const body = await request.json() as {
      amount: number;
      reason: string;
      reference?: string;
    };

    const { amount, reason, reference } = body;

    if (!amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, reason' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get booking with Zoho invoice ID and client ID
    const booking = await db.prepare(
      `SELECT * FROM bookings WHERE id = ?`
    ).bind(id).first() as {
      id: number;
      zoho_invoice_id: string;
      client_id: number;
      status: string;
    } | null;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.zoho_invoice_id) {
      return NextResponse.json({ error: 'No invoice associated with this booking' }, { status: 400 });
    }

    // Get client details for Zoho contact
    const client = await db.prepare(
      `SELECT * FROM users WHERE id = ?`
    ).bind(booking.client_id).first() as {
      id: number;
      name: string;
      email: string;
      zoho_contact_id: string;
    } | null;

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Create credit note in Zoho
    try {
      const creditNoteResult = await createCreditNote(
        client.zoho_contact_id,
        [{
          name: `Refund for booking #${id}`,
          rate: amount,
          quantity: 1,
        }],
        reference || `Refund-${id}`
      ) as { creditnote?: { creditnote_id: string } };

      if (!creditNoteResult.creditnote) {
        return NextResponse.json(
          { error: 'Failed to create credit note' },
          { status: 500 }
        );
      }

      const creditNoteId = creditNoteResult.creditnote.creditnote_id;

      // Apply credit note to invoice
      await applyCreditNoteToInvoice(creditNoteId, booking.zoho_invoice_id, amount);

      // Update booking with credit note ID
      await db.prepare(
        `UPDATE bookings SET zoho_credit_note_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(creditNoteId, booking.id).run();

      return NextResponse.json({
        success: true,
        credit_note_id: creditNoteId,
        booking_id: booking.id,
        amount,
        reason,
      });
    } catch (zohoError) {
      console.error('Zoho refund processing failed:', zohoError);
      return NextResponse.json(
        { error: 'Failed to process refund in Zoho' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}
