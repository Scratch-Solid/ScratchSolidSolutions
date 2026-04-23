import { NextRequest, NextResponse } from "next/server";
import { getDb, getPendingContracts, createPendingContract, updatePendingContractStatus, deletePendingContract } from "../../../lib/db";
import { withAuth, withSecurityHeaders, withTracing } from "../../../lib/middleware";

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
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const data = await request.json();
  const newContract = await createPendingContract(db, {
    full_name: data.fullName || data.full_name || '',
    id_passport_number: data.idPassportNumber || data.id_passport_number || '',
    contact_number: data.contactNumber || data.contact_number || '',
    position_applied_for: data.positionAppliedFor || data.position_applied_for || '',
    department: data.department || 'cleaning',
    generated_username: data.generatedUsername || data.generated_username || '',
    status: data.status || 'pending',
    applicant_signature: data.applicantSignature || data.applicant_signature || '',
    witness_representative: data.witnessRepresentative || data.witness_representative || '',
    consent_data: data.consentData || data.consent_data || '{}'
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
  const body = await request.json();
  
  if (id && body.status) {
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
