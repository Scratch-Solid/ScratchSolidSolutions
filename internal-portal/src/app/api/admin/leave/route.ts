export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = `
      SELECT lr.*, u.name AS staff_name, u.role AS staff_role
      FROM leave_requests lr
      JOIN users u ON u.id = lr.user_id
    `;
    const params: any[] = [];
    if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      query += ` WHERE lr.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY lr.created_at DESC`;

    const result = await db.prepare(query).bind(...params).all();
    const response = NextResponse.json({ data: result.results || [] });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch leave requests: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
