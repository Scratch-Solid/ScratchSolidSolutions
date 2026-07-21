export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Migrated to staff (2026-07-20 consolidation); department = 'cleaning'
    // preserves cleaner_profiles' implicit "cleaners only" scope now that
    // staff also holds supervisors/digital/transport rows.
    let query = `
      SELECT s.paysheet_code, s.first_name, s.last_name, s.status
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE (u.deleted = 0 OR u.deleted IS NULL) AND s.department = 'cleaning'
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    const cleaners = await db.prepare(query).bind(...params).all();

    const response = NextResponse.json({
      success: true,
      data: cleaners.results || []
    });
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Staff cleaners fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Failed to fetch cleaners'
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
