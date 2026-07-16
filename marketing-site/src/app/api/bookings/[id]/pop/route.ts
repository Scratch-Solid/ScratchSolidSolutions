export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  try {
    const bookingId = parseInt(id);
    const body = await request.json() as { pop_url?: string; pop_reference?: string };
    const { pop_url, pop_reference } = body;

    if (!pop_url && !pop_reference) {
      const response = NextResponse.json({ error: 'A payment reference or proof-of-payment file is required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Update booking with POP information
    await db.prepare(
      `UPDATE bookings 
       SET pop_url = ?, pop_reference = ?, pop_submitted_at = CURRENT_TIMESTAMP, status = 'pending_verification'
       WHERE id = ?`
    ).bind(pop_url || null, pop_reference || null, bookingId).run();

    const response = NextResponse.json({ message: 'Proof of payment submitted successfully' });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error submitting POP:', error);
    const response = NextResponse.json({ error: `Failed to submit proof of payment: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
