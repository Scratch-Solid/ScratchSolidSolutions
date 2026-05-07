import { NextRequest, NextResponse } from "next/server";
import { getDb, getPendingContracts, createPendingContract, updatePendingContractStatus, deletePendingContract } from "../../../lib/db";
import { withAuth, withSecurityHeaders, withTracing, withRateLimit } from "../../../lib/middleware";
import { validatePhone, validateSaIdNumber, validateSaPassport } from "../../../lib/validation";

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

  // Validate phone number
  const contactNumber = data.contactNumber || data.contact_number || '';
  const phoneValidation = validatePhone(contactNumber);
  if (!phoneValidation.valid) {
    const response = NextResponse.json({ error: phoneValidation.errors.join(', ') }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }

  // Validate ID/Passport number
  const idPassportNumber = data.idPassportNumber || data.id_passport_number || '';
  if (!idPassportNumber) {
    const response = NextResponse.json({ error: 'ID or passport number is required' }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  } else {
    const idPassportValidation = idPassportNumber.replace(/\D/g, '').length === 13
      ? validateSaIdNumber(idPassportNumber)
      : validateSaPassport(idPassportNumber);
    if (!idPassportValidation.valid) {
      const response = NextResponse.json({ error: idPassportValidation.errors.join(', ') }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }
  }

  const consentData = {
    ...JSON.parse(data.consentData || data.consent_data || '{}'),
    password: data.password || null // Password will be set during profile creation
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
    // If approving, just update status - user will be created during profile creation
    if (body.status === 'approved') {
      const updated = await updatePendingContractStatus(db, parseInt(id), 'approved');
      return NextResponse.json(updated);
    }

    // If rejecting, add rejection reason if provided
    if (body.status === 'rejected') {
      const contract = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(parseInt(id)).first();
      if (!contract) {
        const response = NextResponse.json({ error: "Contract not found" }, { status: 404 });
        return withSecurityHeaders(response, traceId);
      }

      // Update with rejection reason
      await db.prepare(
        `UPDATE pending_contracts SET status = ?, rejection_reason = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind('rejected', body.rejection_reason || 'Application rejected', parseInt(id)).run();

      const updated = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(parseInt(id)).first();
      return NextResponse.json(updated);
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
