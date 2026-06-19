export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'supervisor']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = `
      SELECT cp.paysheet_code, cp.first_name, cp.last_name, cp.status
      FROM cleaner_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.deleted = 0 OR u.deleted IS NULL
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND cp.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cp.created_at DESC';

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
