export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

// Implements reconciliation directly against this app's own payments/
// bookings tables - previously proxied to backend-worker, which reports on
// its own separate, disconnected database (see lib/paystack.ts header
// comment) - always empty/stale relative to real payment activity.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

    const summary = await db.prepare(`
      SELECT
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN refunded_amount END), 0) as total_refunded,
        COALESCE(SUM(CASE WHEN status = 'completed' AND gateway = 'paystack' THEN amount END), 0) as paystack_collected
      FROM payments
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    `).bind(startDate, endDate).first();

    const payments = await db.prepare(`
      SELECT
        p.id, p.booking_id, p.amount, p.status, p.gateway,
        p.external_payment_id, p.refunded_amount, p.refund_reason,
        p.created_at, p.payment_date, p.refunded_at,
        b.service_type, b.status as booking_status
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE date(p.created_at) >= date(?) AND date(p.created_at) <= date(?)
      ORDER BY p.created_at DESC
      LIMIT 200
    `).bind(startDate, endDate).all();

    const discrepancies = await db.prepare(`
      SELECT p.id, p.booking_id, p.amount, p.status as payment_status,
             b.status as booking_status
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.status = 'completed' AND b.status NOT IN ('confirmed', 'completed')
        AND date(p.created_at) >= date(?) AND date(p.created_at) <= date(?)
    `).bind(startDate, endDate).all();

    const response = NextResponse.json({
      period: { start_date: startDate, end_date: endDate },
      summary: summary || {},
      payments: payments.results || [],
      discrepancies: discrepancies.results || [],
      discrepancy_count: (discrepancies.results || []).length,
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Reconciliation error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Reconciliation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
