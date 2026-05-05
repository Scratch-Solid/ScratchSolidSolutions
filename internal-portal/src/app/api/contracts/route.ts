import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const results = await db.prepare(
      'SELECT c.*, u.name as business_name FROM contracts c LEFT JOIN users u ON c.business_id = u.id ORDER BY c.created_at DESC LIMIT 100'
    ).all();
    const response = NextResponse.json(results.results || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
