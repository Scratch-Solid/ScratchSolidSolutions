import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withSecurityHeaders, withTracing, withRateLimit } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const data = await request.json() as any;
  const { consentData, signatureDate } = data;

  try {
    // Find the contract
    const contract = await db.prepare('SELECT * FROM pending_contracts WHERE contact_number = ? AND id_passport_number = ? ORDER BY submitted_at DESC LIMIT 1')
      .bind(consentData.contactNumber, consentData.idPassportNumber).first();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Update contract status to signed with signature date
    await db.prepare('UPDATE pending_contracts SET status = ?, consent_data = ? WHERE id = ?')
      .bind('signed', JSON.stringify({ ...JSON.parse((contract as any).consent_data || '{}'), signatureDate }), (contract as any).id).run();

    // Store signed contract in employees table with signature date
    await db.prepare(
      `INSERT INTO employees (pending_contract_id, full_name, id_passport_number, contact_number, position_applied_for, department, username, status, applicant_signature, witness_representative, consent_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      (contract as any).id,
      (contract as any).full_name,
      (contract as any).id_passport_number,
      (contract as any).contact_number,
      (contract as any).position_applied_for,
      (contract as any).department,
      (contract as any).generated_username,
      'active',
      (contract as any).applicant_signature,
      (contract as any).witness_representative,
      signatureDate || new Date().toISOString()
    ).run();

    const response = NextResponse.json({ success: true, signatureDate });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error signing contract:', error);
    const response = NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
