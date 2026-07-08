export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.scratchsolidsolutions.org/api';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const body = await request.json() as {
      reference: string;
      amount?: number;
      reason?: string;
    };

    const { reference, amount, reason } = body;

    if (!reference) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'reference is required' }, { status: 400 }),
        traceId
      );
    }

    const response = await fetch(`${BACKEND_API_URL}/payments/paystack/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({ reference, amount, reason }),
    });

    const data = await response.json();

    return withSecurityHeaders(
      NextResponse.json(data, { status: response.status }),
      traceId
    );
  } catch (error) {
    logger.error('Paystack refund proxy error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: 'Refund failed' }, { status: 500 }),
      traceId
    );
  }
}
