export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb, getPendingContracts, createPendingContract, updatePendingContractStatus, deletePendingContract, logAuditEvent } from "../../../lib/db";
import { withAuth, withSecurityHeaders, withTracing, withRateLimit, withCsrf } from "../../../lib/middleware";
import { validatePhone, validateSaIdNumber, validateSaPassport } from "../../../lib/validation";
import { sanitizeRequestBody } from '@/lib/sanitization';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;

  const contracts = await db.prepare(
    'SELECT * FROM pending_contracts ORDER BY submitted_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const countResult = await db.prepare('SELECT COUNT(*) as total FROM pending_contracts').first();
  const total = (countResult as any)?.total || 0;

  const response = NextResponse.json({
    data: contracts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
  response.headers.set('Cache-Control', 'private, max-age=30');
  return withSecurityHeaders(response, traceId);
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) {
    console.error('Database unavailable (pending-contracts submit)');
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

  // Create or update user with temp password = phone digits, username = generatedUsername
  try {
    // Ensure optional columns exist
    await db.prepare('ALTER TABLE users ADD COLUMN username TEXT').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN password_needs_reset INTEGER DEFAULT 0').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0').run().catch(() => {});

    const phoneDigits = contactNumber.replace(/\D/g, '');
    const tempPasswordHash = await bcrypt.hash(phoneDigits, 10);
    const username = data.generatedUsername || data.generated_username || data.fullName || `user${Date.now()}`;
    const email = data.email || `${username}@scratch.local`;

    const existingUser = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').bind(username, email).first();

    if (existingUser) {
      await db.prepare(
        `UPDATE users SET password_hash = ?, phone = ?, role = ?, name = ?, password_needs_reset = 1, login_count = 0, username = ?, email = ? WHERE id = ?`
      ).bind(tempPasswordHash, contactNumber, 'cleaner', data.fullName || data.full_name || username, username, email, (existingUser as any).id).run();
    } else {
      await db.prepare(
        `INSERT INTO users (email, password_hash, role, name, phone, username, password_needs_reset, login_count)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0)`
      ).bind(email, tempPasswordHash, 'cleaner', data.fullName || data.full_name || username, contactNumber, username).run();
    }
  } catch (err) {
    console.error('User provisioning failed after consent submission:', err);
  }

  const response = NextResponse.json(newContract, { status: 201 });
  return withSecurityHeaders(response, traceId);
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const body = await request.json();

  const { sanitized, error } = sanitizeRequestBody(body, {
    required: ['status'],
    optional: ['rejection_reason']
  });

  if (error) {
    const response = NextResponse.json({ error }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }

  const sanitizedData = sanitized as any;

  if (id && sanitizedData.status) {
    // If approving, just update status - user will be created during profile creation
    if (sanitizedData.status === 'approved') {
      const updated = await updatePendingContractStatus(db, parseInt(id), 'approved');
      // @ts-ignore
      await logAuditEvent(db, (user as any).id, 'approve_contract', 'pending_contract', parseInt(id), JSON.stringify({ contract_id: id }), request.headers.get('x-forwarded-for') || '');
      return NextResponse.json(updated);
    }

    // If rejecting, add rejection reason if provided
    if (sanitizedData.status === 'rejected') {
      const contract = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(parseInt(id)).first();
      if (!contract) {
        const response = NextResponse.json({ error: "Contract not found" }, { status: 404 });
        return withSecurityHeaders(response, traceId);
      }

      // Update with rejection reason
      await db.prepare(
        `UPDATE pending_contracts SET status = ?, rejection_reason = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind('rejected', sanitizedData.rejection_reason || 'Application rejected', parseInt(id)).run();

      // @ts-ignore
      await logAuditEvent(db, (user as any).id, 'reject_contract', 'pending_contract', parseInt(id), JSON.stringify({ contract_id: id, rejection_reason: sanitizedData.rejection_reason }), request.headers.get('x-forwarded-for') || '');

      const updated = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(parseInt(id)).first();
      return NextResponse.json(updated);
    }

    const updated = await updatePendingContractStatus(db, parseInt(id), sanitizedData.status);
    if (updated) {
      // @ts-ignore
      await logAuditEvent(db, (user as any).id, 'update_contract_status', 'pending_contract', parseInt(id), JSON.stringify({ contract_id: id, status: sanitizedData.status }), request.headers.get('x-forwarded-for') || '');
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
  const { db, user } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id) {
    await deletePendingContract(db, parseInt(id));
    // @ts-ignore
    await logAuditEvent(db, (user as any).id, 'delete_contract', 'pending_contract', parseInt(id), JSON.stringify({ contract_id: id }), request.headers.get('x-forwarded-for') || '');
    return NextResponse.json({ success: true });
  }
  const response = NextResponse.json({ error: "ID required" }, { status: 400 });
  return withSecurityHeaders(response, traceId);
}
