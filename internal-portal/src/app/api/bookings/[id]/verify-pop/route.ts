export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withRateLimit, withCsrf, withSecurityHeaders, withTracing } from '@/lib/middleware';
import { verifyPOP } from '@/lib/zoho';

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
      popReference: string;
    };

    const { popReference } = body;

    if (!popReference) {
      return NextResponse.json(
        { error: 'Missing required field: popReference' },
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

    // Verify POP in Zoho
    try {
      const verificationResult = await verifyPOP(booking.zoho_invoice_id, popReference);

      return NextResponse.json({
        success: true,
        verified: verificationResult.verified,
        payment: verificationResult.payment,
        booking_id: booking.id,
      });
    } catch (zohoError) {
      console.error('Zoho POP verification failed:', zohoError);
      return NextResponse.json(
        { error: 'Failed to verify POP in Zoho' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('POP verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify POP' },
      { status: 500 }
    );
  }
}
