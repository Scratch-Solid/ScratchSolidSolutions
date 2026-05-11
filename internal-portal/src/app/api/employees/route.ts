export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getEmployees, createEmployee } from "../../../lib/db";
import { withAuth, withTracing, withSecurityHeaders } from '../../../lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const {
      positionAppliedFor,
      fullName,
      idPassportNumber,
      contactNumber,
      applicantSignature,
      witnessRepresentative,
      consentDate,
      status,
      pendingContractId
    } = body;

    // Validate required fields
    if (!positionAppliedFor || !fullName || !idPassportNumber || !contactNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create employee record in database
    const employee = await createEmployee(db, {
      full_name: fullName,
      id_passport_number: idPassportNumber,
      contact_number: contactNumber,
      position_applied_for: positionAppliedFor,
      department: body.department || 'cleaning',
      username: body.username || '',
      applicant_signature: applicantSignature || '',
      witness_representative: witnessRepresentative || '',
      consent_date: consentDate || new Date().toISOString(),
      status: status || 'active',
      pending_contract_id: pendingContractId || null
    });

    const response = NextResponse.json(employee, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const employees = await getEmployees(db);
    const response = NextResponse.json(employees, { status: 200 });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
