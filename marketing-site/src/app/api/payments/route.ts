import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const { booking_id, payment_method, amount, user_id } = body;

    if (!booking_id || !payment_method || !amount || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO payments (user_id, booking_id, amount, method, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', datetime('now')) RETURNING *`
    ).bind(user_id, booking_id, amount, payment_method).first();

    if (!result) {
      return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
    }

    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating payment:', error);
    const response = NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
