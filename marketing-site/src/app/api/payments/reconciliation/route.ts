export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.scratchsolidsolutions.org/api';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';

    const queryParams = new URLSearchParams();
    if (startDate) queryParams.set('start_date', startDate);
    if (endDate) queryParams.set('end_date', endDate);

    const response = await fetch(
      `${BACKEND_API_URL}/payments/reconciliation?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
      }
    );

    const data = await response.json();

    return withSecurityHeaders(
      NextResponse.json(data, { status: response.status }),
      traceId
    );
  } catch (error) {
    logger.error('Reconciliation proxy error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 }),
      traceId
    );
  }
}
