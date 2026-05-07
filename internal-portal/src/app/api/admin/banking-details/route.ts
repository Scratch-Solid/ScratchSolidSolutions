import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const bankingDetails = await db.prepare(
      'SELECT * FROM banking_details WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    ).first();
    
    const response = NextResponse.json(bankingDetails || null);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching banking details:', error);
    const response = NextResponse.json({ error: 'Failed to fetch banking details' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const { bank_name, account_number, account_holder, branch_code, account_type } = body;

    if (!bank_name || !account_number || !account_holder || !branch_code) {
      const response = NextResponse.json({ error: 'All banking details are required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Deactivate existing banking details
    await db.prepare('UPDATE banking_details SET is_active = 0 WHERE is_active = 1').run();

    // Insert new banking details
    const result = await db.prepare(
      `INSERT INTO banking_details (bank_name, account_number, account_holder, branch_code, account_type, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`
    ).bind(bank_name, account_number, account_holder, branch_code, account_type || 'current').first();

    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating banking details:', error);
    const response = NextResponse.json({ error: 'Failed to create banking details' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const { id, bank_name, account_number, account_holder, branch_code, account_type, is_active } = body;

    if (!id) {
      const response = NextResponse.json({ error: 'Banking details ID is required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `UPDATE banking_details 
       SET bank_name = ?, account_number = ?, account_holder = ?, branch_code = ?, account_type = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING *`
    ).bind(bank_name, account_number, account_holder, branch_code, account_type || 'current', is_active !== undefined ? (is_active ? 1 : 0) : 1, id).first();

    if (!result) {
      const response = NextResponse.json({ error: 'Banking details not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json(result);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error updating banking details:', error);
    const response = NextResponse.json({ error: 'Failed to update banking details' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
