import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    let results;
    if (businessId) {
      results = await db.prepare(
        'SELECT * FROM business_events WHERE business_id = ? ORDER BY created_at DESC'
      ).bind(businessId).all();
    } else {
      results = await db.prepare(
        'SELECT * FROM business_events ORDER BY created_at DESC LIMIT 100'
      ).all();
    }
    const response = NextResponse.json(results.results || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching business events:', error);
    const response = NextResponse.json({ error: 'Failed to fetch business events' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { business_id, event_type, requested_date, special_instructions } = await request.json();
    if (!business_id || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await db.prepare(
      'INSERT INTO business_events (business_id, event_type, requested_date, special_instructions, created_at) VALUES (?, ?, ?, ?, datetime("now")) RETURNING *'
    ).bind(business_id, event_type, requested_date || '', special_instructions || '').first();
    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating business event:', error);
    const response = NextResponse.json({ error: 'Failed to create business event' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
