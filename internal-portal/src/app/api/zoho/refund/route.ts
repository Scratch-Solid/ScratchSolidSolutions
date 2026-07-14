export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';
import { createCreditNote } from '@/lib/zoho';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const { user_id, amount, reference } = await request.json() as { user_id?: string; amount?: number; reference?: string };
    if (!user_id || !amount) {
      const response = NextResponse.json({ error: 'Missing required fields: user_id, amount' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const data = await createCreditNote(
      user_id,
      [{ item_id: 'default_service', rate: amount, quantity: 1 }],
      reference || `refund-${Date.now()}`
    );

    const response = NextResponse.json(data, { status: data.code === 0 ? 201 : 502 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
