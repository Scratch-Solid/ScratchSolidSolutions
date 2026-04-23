import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    
    const body = await request.json();
    const { business_id, business_name, contract_type, rate_per_hour, weekend_rate_multiplier, start_date, end_date, terms } = body;

    if (!business_id || !business_name || !rate_per_hour || !start_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO contracts (business_id, business_name, contract_type, rate_per_hour, weekend_rate_multiplier, start_date, end_date, terms, status, is_immutable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)`
    ).bind(
      business_id,
      business_name,
      contract_type || 'standard',
      rate_per_hour,
      weekend_rate_multiplier || 1.5,
      start_date,
      end_date || null,
      terms || ''
    ).run();

    const contract = await db.prepare('SELECT * FROM contracts WHERE id = ?').bind(result.meta.last_row_id).first();

    const response = NextResponse.json(contract, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating contract:', error);
    const response = NextResponse.json({ error: 'Contract creation failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get('business_id');

    let result;
    if (business_id) {
      result = await db.prepare('SELECT * FROM contracts WHERE business_id = ?').bind(business_id).all();
    } else {
      result = await db.prepare('SELECT * FROM contracts').all();
    }

    const response = NextResponse.json(result.results || []);
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    const response = NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
