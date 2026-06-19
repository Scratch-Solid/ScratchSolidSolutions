export const dynamic = "force-dynamic";
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
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const db = await getDb();
  if (!db) {
    return withSecurityHeaders(NextResponse.json({ error: 'Database unavailable' }, { status: 503 }), traceId);
  }

  try {
    const body = await request.json() as {
      user_id?: string | number;
      business_name?: string;
      duration?: string;
      rate?: number;
      status?: string;
    };

    const userId = body.user_id ? parseInt(String(body.user_id), 10) : null;
    if (!userId) {
      return withSecurityHeaders(NextResponse.json({ error: 'user_id is required' }, { status: 400 }), traceId);
    }

    // Map form fields to schema columns
    const terms = JSON.stringify({
      duration: body.duration,
      rate: body.rate,
      business_name: body.business_name
    });

    const result = await db.prepare(
      'INSERT INTO contracts (business_id, status, terms, contract_type) VALUES (?, ?, ?, ?)'
    ).bind(userId, body.status || 'pending', terms, body.duration || 'standard').run();

    const response = NextResponse.json({
      success: true,
      id: result.meta.last_row_id
    }, { status: 201 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Contract creation error:', error);
    const response = NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  }
}
