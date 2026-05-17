export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRateLimit } from '@/lib/middleware';
import { recordPayment } from '@/lib/zoho';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await params;

  try {
    const body = await request.json() as {
      amount: number;
      paymentMode: 'cash' | 'eft' | 'card';
      date: string;
      reference?: string;
    };

    const { amount, paymentMode, date, reference } = body;

    if (!amount || !paymentMode || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, paymentMode, date' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get booking with Zoho invoice ID
    const booking = await db.prepare(
      `SELECT * FROM bookings WHERE id = ?`
    ).bind(id).first() as {
      id: number;
      zoho_invoice_id: string;
      status: string;
    } | null;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.zoho_invoice_id) {
      return NextResponse.json({ error: 'No invoice associated with this booking' }, { status: 400 });
    }

    // Record payment in Zoho
    try {
      const paymentResult = await recordPayment(
        booking.zoho_invoice_id,
        amount,
        paymentMode,
        date
      );

      return NextResponse.json({
        success: true,
        payment: paymentResult,
        booking_id: booking.id,
      });
    } catch (zohoError) {
      console.error('Zoho payment recording failed:', zohoError);
      return NextResponse.json(
        { error: 'Failed to record payment in Zoho' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Payment recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
