export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb, getPendingContracts, createPendingContract, updatePendingContractStatus, deletePendingContract, logAuditEvent, addOnboardingStageToUsers, updateUserOnboardingStage, logOnboardingTransition, logNotification } from "../../../lib/db";
import { withAuth, withSecurityHeaders, withTracing, withRateLimit, withCsrf } from "../../../lib/middleware";
import { validatePhone, validateSaIdNumber, validateSaPassport } from "../../../lib/validation";
import { sanitizeRequestBody } from '@/lib/sanitization';
import { notifyConsentSubmitted, notifyAdminApproved, notifyAdminRejected } from "@/lib/notifications";
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
    data: contracts.results || [],
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
  console.log('[PENDING-CONTRACTS POST] Starting request');
  
  try {
    const rateLimitResponse = await withRateLimit(request);
    if (rateLimitResponse) {
      console.log('[PENDING-CONTRACTS POST] Rate limit exceeded');
      return rateLimitResponse;
    }

    const traceId = withTracing(request);
    const db = await getDb();
    if (!db) {
      console.error('[PENDING-CONTRACTS POST] Database unavailable');
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    console.log('[PENDING-CONTRACTS POST] Database connected');

    const data = await request.json() as any;
    console.log('[PENDING-CONTRACTS POST] Request body parsed:', JSON.stringify(data, null, 2));

    // Validate phone number
    const contactNumber = data.contactNumber || data.contact_number || '';
    console.log('[PENDING-CONTRACTS POST] Contact number:', contactNumber);
    const phoneValidation = validatePhone(contactNumber);
    if (!phoneValidation.valid) {
      console.log('[PENDING-CONTRACTS POST] Phone validation failed:', phoneValidation.errors);
      return NextResponse.json({ error: phoneValidation.errors.join(', ') }, { status: 400 });
    }

    // Validate ID/Passport number
    const idPassportNumber = data.idPassportNumber || data.id_passport_number || '';
    console.log('[PENDING-CONTRACTS POST] ID/Passport:', idPassportNumber);
    if (!idPassportNumber) {
      console.log('[PENDING-CONTRACTS POST] ID/Passport missing');
      return NextResponse.json({ error: 'ID or passport number is required' }, { status: 400 });
    } else {
      const idPassportValidation = idPassportNumber.replace(/\D/g, '').length === 13
        ? validateSaIdNumber(idPassportNumber)
        : validateSaPassport(idPassportNumber);
      if (!idPassportValidation.valid) {
        console.log('[PENDING-CONTRACTS POST] ID/Passport validation failed:', idPassportValidation.errors);
        return NextResponse.json({ error: idPassportValidation.errors.join(', ') }, { status: 400 });
      }
    }

    const consentData = {
      ...JSON.parse(data.consentData || data.consent_data || '{}'),
      password: data.password || null // Password will be set during profile creation
    };
    console.log('[PENDING-CONTRACTS POST] Creating pending contract');
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
    console.log('[PENDING-CONTRACTS POST] Pending contract created:', JSON.stringify(newContract, null, 2));

    // Create or update user with temp password = phone digits, username = generatedUsername
    console.log('[PENDING-CONTRACTS POST] Starting user provisioning');
    try {
      // Ensure optional columns exist
      await db.prepare('ALTER TABLE users ADD COLUMN username TEXT').run().catch(() => {});
      await db.prepare('ALTER TABLE users ADD COLUMN password_needs_reset INTEGER DEFAULT 0').run().catch(() => {});
      await db.prepare('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0').run().catch(() => {});

      // Ensure onboarding_stage column exists
      await addOnboardingStageToUsers(db);

      const phoneDigits = contactNumber.replace(/\D/g, '');
      console.log('[PENDING-CONTRACTS POST] Phone digits:', phoneDigits);
      // Note: Temporary password is set to phone digits for initial login
      // Users should be informed that their initial password is their phone number (digits only)
      const tempPasswordHash = await bcrypt.hash(phoneDigits, 12);
      const username = data.generatedUsername || data.generated_username || data.fullName || `user${Date.now()}`;
      const email = data.email || `${username}@scratch.local`;
      console.log('[PENDING-CONTRACTS POST] Username:', username, 'Email:', email);

      const existingUser = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').bind(username, email).first();
      console.log('[PENDING-CONTRACTS POST] Existing user:', existingUser ? 'Yes' : 'No');

      let userId: number;
      if (existingUser) {
        console.log('[PENDING-CONTRACTS POST] Updating existing user:', (existingUser as any).id);
        await db.prepare(
          `UPDATE users SET password_hash = ?, phone = ?, role = ?, name = ?, password_needs_reset = 1, login_count = 0, username = ?, email = ? WHERE id = ?`
        ).bind(tempPasswordHash, contactNumber, 'cleaner', data.fullName || data.full_name || username, username, email, (existingUser as any).id).run();
        userId = (existingUser as any).id;
      } else {
        console.log('[PENDING-CONTRACTS POST] Creating new user');
        const result = await db.prepare(
          `INSERT INTO users (email, password_hash, role, name, phone, username, password_needs_reset, login_count, onboarding_stage)
           VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'consent_pending')`
        ).bind(email, tempPasswordHash, 'cleaner', data.fullName || data.full_name || username, contactNumber, username).run();
        userId = result.meta.last_row_id;
      }

      // Set onboarding stage to consent_pending
      await updateUserOnboardingStage(db, userId, 'consent_pending');
      
      // Log the stage transition
      await logOnboardingTransition(db, {
        user_id: userId,
        to_stage: 'consent_pending',
        event_type: 'consent_submitted',
        metadata: { contract_id: newContract.id },
        ip_address: request.headers.get('x-forwarded-for') || undefined,
        user_agent: request.headers.get('user-agent') || undefined
      });

      // Send WhatsApp notification for consent submitted
      const notifyResult = await notifyConsentSubmitted(contactNumber, data.fullName || data.full_name || username, undefined, db);
      await logNotification(db, {
        user_id: userId,
        phone_number: contactNumber,
        notification_type: 'consent_submitted',
        channel: 'whatsapp',
        template_name: 'consent_submitted',
        status: notifyResult.success ? 'sent' : 'failed',
        message_id: notifyResult.messageId,
        error_message: notifyResult.error,
        metadata: { contract_id: newContract.id }
      });

      console.log('[PENDING-CONTRACTS POST] User provisioning successful');
    } catch (err) {
      console.error('[PENDING-CONTRACTS POST] User provisioning failed:', err);
    }

    console.log('[PENDING-CONTRACTS POST] Returning success response');
    return NextResponse.json(newContract, { status: 201 });
  } catch (error) {
    console.error('[PENDING-CONTRACTS POST] Unhandled error:', error);
    return NextResponse.json({ error: 'Failed to process consent form', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
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
    return withSecurityHeaders(NextResponse.json({ error }, { status: 400 }), traceId);
  }

  const sanitizedData = sanitized as any;

  if (id && sanitizedData.status) {
    // If approving, update status and set onboarding stage to consent_approved
    if (sanitizedData.status === 'approved') {
      const updated = await updatePendingContractStatus(db, parseInt(id), 'approved');
      
      // Get the pending contract to find the associated user
      const contract = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(parseInt(id)).first();
      if (contract) {
        // Find user by generated username
        const generatedUsername = (contract as any).generated_username || (contract as any).generatedUsername;
        if (generatedUsername) {
          const user = await db.prepare('SELECT id FROM users WHERE username = ?').bind(generatedUsername).first();
          if (user) {
            // Update user onboarding stage to consent_approved
            await updateUserOnboardingStage(db, (user as any).id, 'consent_approved');
            
            // Log the stage transition
            await logOnboardingTransition(db, {
              user_id: (user as any).id,
              from_stage: 'consent_pending',
              to_stage: 'consent_approved',
              event_type: 'consent_approved',
              metadata: { contract_id: parseInt(id) },
              ip_address: request.headers.get('x-forwarded-for') || undefined,
              user_agent: request.headers.get('user-agent') || undefined
            });

            // Send WhatsApp notification for admin approval
            const contactNumber = (contract as any).contact_number;
            const fullName = (contract as any).full_name;
            if (contactNumber) {
              const notifyResult = await notifyAdminApproved(contactNumber, fullName, undefined, db);
              await logNotification(db, {
                user_id: (user as any).id,
                phone_number: contactNumber,
                notification_type: 'admin_approved',
                channel: 'whatsapp',
                template_name: 'admin_approved',
                status: notifyResult.success ? 'sent' : 'failed',
                message_id: notifyResult.messageId,
                error_message: notifyResult.error,
                metadata: { contract_id: parseInt(id) }
              });
            }
          }
        }
      }

      await logAuditEvent(db, {
        user_id: (user as any).id,
        action: 'approve_contract',
        resource: 'pending_contract',
        resource_id: String(id),
        details: JSON.stringify({ contract_id: id }),
        ip_address: request.headers.get('x-forwarded-for') || ''
      });
      return NextResponse.json(updated);
    }

    // If rejecting, add rejection reason if provided and set onboarding stage to rejected
    if (sanitizedData.status === 'rejected') {
      const contract = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(parseInt(id)).first();
      if (!contract) {
        return withSecurityHeaders(NextResponse.json({ error: "Contract not found" }, { status: 404 }), traceId);
      }

      // Update with rejection reason
      await db.prepare(
        `UPDATE pending_contracts SET status = ?, rejection_reason = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind('rejected', sanitizedData.rejection_reason || 'Application rejected', parseInt(id)).run();

      // Find user by generated username and set onboarding stage to rejected
      const generatedUsername = (contract as any).generated_username || (contract as any).generatedUsername;
      if (generatedUsername) {
        const user = await db.prepare('SELECT id FROM users WHERE username = ?').bind(generatedUsername).first();
        if (user) {
          await updateUserOnboardingStage(db, (user as any).id, 'rejected');
          
          // Log the stage transition
          await logOnboardingTransition(db, {
            user_id: (user as any).id,
            from_stage: 'consent_pending',
            to_stage: 'rejected',
            event_type: 'consent_rejected',
            metadata: { contract_id: parseInt(id), rejection_reason: sanitizedData.rejection_reason },
            ip_address: request.headers.get('x-forwarded-for') || undefined,
            user_agent: request.headers.get('user-agent') || undefined
          });

          // Send WhatsApp notification for admin rejection
          const contactNumber = (contract as any).contact_number;
          const fullName = (contract as any).full_name;
          if (contactNumber) {
            const notifyResult = await notifyAdminRejected(contactNumber, fullName, sanitizedData.rejection_reason, undefined, db);
            await logNotification(db, {
              user_id: (user as any).id,
              phone_number: contactNumber,
              notification_type: 'admin_rejected',
              channel: 'whatsapp',
              template_name: 'admin_rejected',
              status: notifyResult.success ? 'sent' : 'failed',
              message_id: notifyResult.messageId,
              error_message: notifyResult.error,
              metadata: { contract_id: parseInt(id), rejection_reason: sanitizedData.rejection_reason }
            });
          }
        }
      }

      await logAuditEvent(db, {
        user_id: (user as any).id,
        action: 'reject_contract',
        resource: 'pending_contract',
        resource_id: String(id),
        details: JSON.stringify({ contract_id: id, rejection_reason: sanitizedData.rejection_reason }),
        ip_address: request.headers.get('x-forwarded-for') || ''
      });

      const updated = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(parseInt(id)).first();
      return NextResponse.json(updated);
    }

    const updated = await updatePendingContractStatus(db, parseInt(id), sanitizedData.status);
    if (updated) {
      await logAuditEvent(db, {
        user_id: (user as any).id,
        action: 'update_contract_status',
        resource: 'pending_contract',
        resource_id: String(id),
        details: JSON.stringify({ contract_id: id, status: sanitizedData.status }),
        ip_address: request.headers.get('x-forwarded-for') || ''
      });
      return NextResponse.json(updated);
    }
  }
  return withSecurityHeaders(NextResponse.json({ error: "Contract not found" }, { status: 404 }), traceId);
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
    await logAuditEvent(db, {
      user_id: (user as any).id,
      action: 'delete_contract',
      resource: 'pending_contract',
      resource_id: String(id),
      details: JSON.stringify({ contract_id: id }),
      ip_address: request.headers.get('x-forwarded-for') || ''
    });
    return NextResponse.json({ success: true });
  }
  return withSecurityHeaders(NextResponse.json({ error: "ID required" }, { status: 400 }), traceId);
}
