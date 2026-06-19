export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'digital']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');

    // Placeholder: digital tasks not yet persisted in DB.
    // Return empty array so the dashboard renders without errors.
    if (page === 'digital-tasks') {
      const response = NextResponse.json([]);
      return withSecurityHeaders(response, traceId);
    }

    // Fallback: try to fetch from marketing_cms if available
    const content = await db.prepare(
      'SELECT id, title, status, priority, created_at FROM marketing_cms ORDER BY created_at DESC LIMIT 50'
    ).all();

    const response = NextResponse.json(content.results || []);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json([], { status: 200 });
    return withSecurityHeaders(response, traceId);
  }
}
