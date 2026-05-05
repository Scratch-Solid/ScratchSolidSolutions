import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
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

    const taskCompletions = await db.prepare(
      'SELECT * FROM task_completions WHERE cleaner_id = ? ORDER BY completed_at DESC'
    ).bind(cleanerId).all();

    const response = NextResponse.json(taskCompletions.results || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch cleaner earnings' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
