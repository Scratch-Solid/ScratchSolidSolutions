export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '../../../lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleaner_id');

    if (!cleanerId) {
      return NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 });
    }

    // Query payroll table for earnings data
    const payrollRecords = await db.prepare(
      'SELECT id, gross_amount, deductions, net_amount, pay_period_start, pay_period_end, status FROM payroll WHERE staff_id = ? ORDER BY pay_period_start DESC'
    ).bind(cleanerId).all();

    const response = NextResponse.json(payrollRecords.results || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch cleaner earnings: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
