import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const bookingId = parseInt(params.id);
    const body = await request.json();
    const { pop_url, pop_reference } = body;

    if (!pop_url) {
      const response = NextResponse.json({ error: 'Proof of payment URL is required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Update booking with POP information
    await db.prepare(
      `UPDATE bookings 
       SET pop_url = ?, pop_reference = ?, pop_submitted_at = CURRENT_TIMESTAMP, status = 'pending_verification'
       WHERE id = ?`
    ).bind(pop_url, pop_reference || null, bookingId).run();

    const response = NextResponse.json({ message: 'Proof of payment submitted successfully' });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error submitting POP:', error);
    const response = NextResponse.json({ error: 'Failed to submit proof of payment' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
