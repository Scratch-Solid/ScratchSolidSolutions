import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    if (!businessId) {
      return NextResponse.json({ error: 'business_id required' }, { status: 400 });
    }
    const results = await db.prepare(
      'SELECT * FROM weekend_requests WHERE business_id = ? ORDER BY created_at DESC'
    ).bind(businessId).all();
    const response = NextResponse.json(results.results || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching weekend requests', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch weekend requests' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as {
      business_id?: number;
      requested_date?: string;
      special_instructions?: string;
    };
    const { business_id, requested_date, special_instructions } = body;
    if (!business_id || !requested_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await db.prepare(
      'INSERT INTO weekend_requests (business_id, requested_date, special_instructions, status, created_at) VALUES (?, ?, ?, ?, datetime("now")) RETURNING *'
    ).bind(business_id, requested_date, special_instructions || '', 'pending').first();
    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating weekend request', error as Error);
    const response = NextResponse.json({ error: 'Failed to create weekend request' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
