import { NextRequest, NextResponse } from "next/server";
import { getDb, getPendingContracts, createPendingContract, updatePendingContractStatus, deletePendingContract } from "../../../lib/db";
import { withAuth, withSecurityHeaders, withTracing, withRateLimit } from "../../../lib/middleware";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  const contracts = await getPendingContracts(db);
  const response = NextResponse.json(contracts);
  response.headers.set('Cache-Control', 'private, max-age=30');
  return withSecurityHeaders(response, traceId);
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const data = await request.json() as any;

  // Basic validation - ensure required fields are present
  const contactNumber = data.contactNumber || data.contact_number || '';
  const idPassportNumber = data.idPassportNumber || data.id_passport_number || '';

  if (!contactNumber) {
    const response = NextResponse.json({ error: 'Contact number is required' }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }

  if (!idPassportNumber) {
    const response = NextResponse.json({ error: 'ID or passport number is required' }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }

  const consentData = {
    ...JSON.parse(data.consentData || data.consent_data || '{}'),
    password: data.password
  };
  const newContract = await createPendingContract(db, {
    full_name: data.fullName || data.full_name || '',
    id_passport_number: idPassportNumber,
    contact_number: contactNumber,
    position_applied_for: data.positionAppliedFor || data.position_applied_for || '',
    department: data.department || 'cleaning',
    generated_username: data.generatedUsername || data.generated_username || '',
    status: 'pending',
    applicant_signature: data.applicantSignature || data.applicant_signature || '',
    witness_representative: data.witnessRepresentative || data.witness_representative || 'Xolani Jason Tshaka',
    consent_data: JSON.stringify(consentData)
  });

  const response = NextResponse.json(newContract, { status: 201 });
  return withSecurityHeaders(response, traceId);
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const body = await request.json() as any;

  if (id && body.status) {
    // If approving, create user and cleaner profile
    if (body.status === 'approved') {
      const contract = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(parseInt(id)).first();
      if (!contract) {
        const response = NextResponse.json({ error: "Contract not found" }, { status: 404 });
        return withSecurityHeaders(response, traceId);
      }

      // Check if user already exists
      const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind((contract as any).contact_number + '@scratchsolid.co.za').first();
      if (existing) {
        const response = NextResponse.json({ error: "User already exists" }, { status: 409 });
        return withSecurityHeaders(response, traceId);
      }

      // Create user
      const bcrypt = require('bcryptjs');
      const consentData = JSON.parse((contract as any).consent_data || '{}');
      const password = consentData.password;
      if (!password) {
        const response = NextResponse.json({ error: 'Password not found in consent data' }, { status: 400 });
        return withSecurityHeaders(response, traceId);
      }
      const password_hash = await bcrypt.hash(password, 10);
      const user = await db.prepare(
        `INSERT INTO users (email, password_hash, role, name, phone)
         VALUES (?, ?, ?, ?, ?) RETURNING *`
      ).bind(
        (contract as any).contact_number + '@scratchsolid.co.za',
        password_hash,
        (contract as any).department === 'Scratch' ? 'cleaner' : (contract as any).department === 'Solid' ? 'digital' : 'transport',
        (contract as any).full_name,
        (contract as any).contact_number
      ).first();

      if (!user) {
        const response = NextResponse.json({ error: "Failed to create user" }, { status: 500 });
        return withSecurityHeaders(response, traceId);
      }

      // Create cleaner profile
      await db.prepare(
        `INSERT INTO cleaner_profiles (user_id, username, paysheet_code, department, status)
         VALUES (?, ?, ?, ?, 'idle')`
      ).bind(
        (user as any).id,
        (contract as any).generated_username,
        (contract as any).generated_username,
        (contract as any).department === 'Scratch' ? 'cleaning' : (contract as any).department === 'Solid' ? 'digital' : 'transport'
      ).run();

      // Update contract status
      const updated = await updatePendingContractStatus(db, parseInt(id), 'approved');
      return NextResponse.json({ ...updated, user_id: (user as any).id });
    }

    const updated = await updatePendingContractStatus(db, parseInt(id), body.status);
    if (updated) {
      return NextResponse.json(updated);
    }
  }
  const response = NextResponse.json({ error: "Contract not found" }, { status: 404 });
  return withSecurityHeaders(response, traceId);
}

export async function DELETE(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id) {
    await deletePendingContract(db, parseInt(id));
    return NextResponse.json({ success: true });
  }
  const response = NextResponse.json({ error: "ID required" }, { status: 400 });
  return withSecurityHeaders(response, traceId);
}
