export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { initializeTransaction, generatePaystackReference } from '@/lib/paystack';

// Implements Paystack directly against this app's own bookings/payments
// tables - previously proxied to backend-worker, which looks up bookings in
// its own separate, always-empty database (see lib/paystack.ts header
// comment). Card payments never worked for a real booking before this.
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const userId = (user as any).user_id;

  try {
    const body = await request.json() as {
      booking_id?: number;
      email?: string;
      amount?: number;
      callback_url?: string;
    };
    const { booking_id, email, amount, callback_url } = body;

    if (!booking_id || !email || !amount) {
      return withSecurityHeaders(NextResponse.json({ error: 'booking_id, email, and amount are required' }, { status: 400 }), traceId);
    }

    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ? AND client_id = ?')
      .bind(booking_id, userId).first();

    if (!booking) {
      return withSecurityHeaders(NextResponse.json({ error: 'Booking not found' }, { status: 404 }), traceId);
    }

    const existingPayment = await db.prepare(
      `SELECT * FROM payments WHERE booking_id = ? AND gateway = 'paystack' AND status IN ('pending', 'processing')`
    ).bind(booking_id).first();

    if (existingPayment) {
      return withSecurityHeaders(NextResponse.json({
        message: 'Payment already initiated',
        reference: (existingPayment as any).external_payment_id,
        authorization_url: null,
      }), traceId);
    }

    const reference = generatePaystackReference(booking_id);

    const initResult = await initializeTransaction({
      email,
      amount: Math.round(amount * 100), // ZAR to kobo
      reference,
      callback_url,
      metadata: {
        booking_id: String(booking_id),
        user_id: userId,
        service_type: (booking as any).service_type || 'cleaning',
      },
    });

    if (!initResult.status || !initResult.data) {
      logger.error('Paystack initialization rejected', new Error(initResult.message || 'unknown'));
      return withSecurityHeaders(
        NextResponse.json({ error: 'Payment initialization failed', detail: initResult.message }, { status: 502 }),
        traceId
      );
    }

    await db.prepare(`
      INSERT INTO payments (user_id, booking_id, amount, status, external_payment_id, gateway, metadata, created_at)
      VALUES (?, ?, ?, 'pending', ?, 'paystack', ?, datetime('now'))
    `).bind(
      userId,
      booking_id,
      amount,
      reference,
      JSON.stringify({ authorization_url: initResult.data.authorization_url, email, currency: 'ZAR' })
    ).run();

    await db.prepare(`UPDATE bookings SET status = 'awaiting_payment', updated_at = datetime('now') WHERE id = ?`)
      .bind(booking_id).run();

    const response = NextResponse.json({
      status: 'pending',
      reference: initResult.data.reference,
      authorization_url: initResult.data.authorization_url,
      access_code: initResult.data.access_code,
      message: 'Payment initialized. Redirect client to authorization_url.',
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Paystack initialize error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Payment initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
