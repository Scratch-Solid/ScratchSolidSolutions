import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as {
      business_id?: number;
      business_name?: string;
      contract_type?: string;
      rate_per_hour?: number;
      weekend_rate_multiplier?: number;
      start_date?: string;
      end_date?: string;
      terms?: string;
      duration?: string;
      weekend_required?: boolean;
    };
    
    const { 
      business_id, 
      business_name, 
      contract_type, 
      rate_per_hour, 
      weekend_rate_multiplier, 
      start_date, 
      end_date, 
      terms,
      duration = '1_year',
      weekend_required = false
    } = body;

    if (!business_id || !start_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate end date based on duration
    let calculatedEndDate = end_date;
    if (!calculatedEndDate && duration) {
      const startDate = new Date(start_date);
      if (duration === '1_year') {
        startDate.setFullYear(startDate.getFullYear() + 1);
      } else if (duration === '5_years') {
        startDate.setFullYear(startDate.getFullYear() + 5);
      }
      calculatedEndDate = startDate.toISOString().split('T')[0];
    }

    const result = await db.prepare(
      `INSERT INTO contracts (business_id, business_name, contract_type, rate_per_hour, weekend_rate_multiplier, start_date, end_date, terms, is_immutable, status, weekend_required, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', ?, datetime('now'))`
    ).bind(
      business_id,
      business_name || '',
      contract_type || 'standard',
      rate_per_hour || 150,
      weekend_rate_multiplier || 1.5,
      start_date,
      calculatedEndDate || null,
      terms || '',
      weekend_required ? 1 : 0
    ).run();

    const contract = await db.prepare('SELECT * FROM contracts WHERE id = ?').bind(result.meta.last_row_id).first();

    // If weekend work is required, create weekend assignment notification
    if (weekend_required) {
      await db.prepare(
        `INSERT INTO weekend_assignments (business_id, contract_id, status, created_at)
         VALUES (?, ?, 'pending', datetime('now'))`
      ).bind(business_id, result.meta.last_row_id).run();
    }

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
