import { NextRequest, NextResponse } from 'next/server';
import { getDb, createPendingContract, getPendingContracts } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString, validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let contracts;
    if (status) {
      contracts = await db.prepare('SELECT * FROM pending_contracts WHERE status = ? ORDER BY submitted_at DESC').bind(status).all();
    } else {
      contracts = await db.prepare('SELECT * FROM pending_contracts ORDER BY submitted_at DESC').all();
    }

    return NextResponse.json(contracts.results || []);
  } catch (error) {
    logger.error('Error fetching pending contracts', error as Error);
    return NextResponse.json({ error: 'Failed to fetch pending contracts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      full_name?: string;
      id_passport_number?: string;
      contact_number?: string;
      position_applied_for?: string;
      department?: string;
      generated_username?: string;
      applicant_signature?: string;
      witness_representative?: string;
      consent_data?: string;
    };

    const { full_name, id_passport_number, contact_number, position_applied_for, department, generated_username, applicant_signature, witness_representative, consent_data } = body;

    if (!full_name || !contact_number) {
      return NextResponse.json({ error: 'Missing required fields: full_name, contact_number' }, { status: 400 });
    }

    const contract = await createPendingContract(db, {
      full_name: full_name || '',
      id_passport_number: id_passport_number || '',
      contact_number: contact_number || '',
      position_applied_for: position_applied_for || '',
      department: department || '',
      generated_username: generated_username || '',
      applicant_signature: applicant_signature || '',
      witness_representative: witness_representative || '',
      consent_data: consent_data || '{}'
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    logger.error('Error creating pending contract', error as Error);
    return NextResponse.json({ error: 'Failed to create pending contract' }, { status: 500 });
  }
}
