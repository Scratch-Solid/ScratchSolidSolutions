import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withSecurityHeaders, withTracing } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const data = await request.json() as any;
  const { firstName, lastName, residentialAddress, cellphone, consentData } = data;

  try {
    // Update cleaner profile with additional info
    const contract = await db.prepare('SELECT * FROM pending_contracts WHERE contact_number = ? AND id_passport_number = ? ORDER BY submitted_at DESC LIMIT 1')
      .bind(consentData.contactNumber, consentData.idPassportNumber).first();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Update the cleaner profile that was created on approval
    await db.prepare(
      `UPDATE cleaner_profiles 
       SET first_name = ?, last_name = ?, residential_address = ?, cellphone = ?
       WHERE username = ?`
    ).bind(firstName, lastName, residentialAddress, cellphone, (contract as any).generated_username).run();

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating profile:', error);
    const response = NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
