export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.scratchsolidsolutions.org/api';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user } = authResult;

  try {
    const body = await request.json() as {
      booking_id: number;
      email: string;
      amount: number;
      callback_url?: string;
    };

    const { booking_id, email, amount, callback_url } = body;

    if (!booking_id || !email || !amount) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'booking_id, email, and amount are required' }, { status: 400 }),
        traceId
      );
    }

    // Forward to backend-worker
    const response = await fetch(`${BACKEND_API_URL}/payments/paystack/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        booking_id,
        email,
        amount,
        callback_url,
      }),
    });

    const data = await response.json();

    return withSecurityHeaders(
      NextResponse.json(data, { status: response.status }),
      traceId
    );
  } catch (error: any) {
    logger.error('Paystack initialization error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: 'Paystack initialization failed' }, { status: 500 }),
      traceId
    );
  }
}
