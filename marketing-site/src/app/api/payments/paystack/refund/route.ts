export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { processRefund } from '@/lib/paystack';

// Implements the refund directly against this app's own payments/bookings
// tables - previously proxied to backend-worker, which looks up payments in
// its own separate, disconnected database (see lib/paystack.ts header
// comment). Real payments live here since the initialize/verify fix, so a
// refund request for one of them would have 404'd against backend-worker's
// copy.
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as { reference?: string; amount?: number; reason?: string };
    const { reference, amount, reason } = body;

    if (!reference) {
      return withSecurityHeaders(NextResponse.json({ error: 'reference is required' }, { status: 400 }), traceId);
    }

    const result = await processRefund(db, { reference, amount, reason });

    if (!result.ok) {
      if (result.status >= 500 || result.status === 502) {
        logger.error('Paystack refund rejected', new Error(result.detail || result.error));
      }
      return withSecurityHeaders(
        NextResponse.json({ error: result.error, detail: 'detail' in result ? result.detail : undefined }, { status: result.status }),
        traceId
      );
    }

    const response = NextResponse.json({
      status: 'success',
      refund: result.data,
      message: 'Refund processed successfully',
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Paystack refund error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
