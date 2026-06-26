export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.scratchsolidsolutions.org/api';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'reference is required' }, { status: 400 }),
        traceId
      );
    }

    // Forward to backend-worker
    const response = await fetch(`${BACKEND_API_URL}/payments/paystack/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    const data = await response.json();

    return withSecurityHeaders(
      NextResponse.json(data, { status: response.status }),
      traceId
    );
  } catch (error: any) {
    logger.error('Paystack verification error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: 'Paystack verification failed' }, { status: 500 }),
      traceId
    );
  }
}
