export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { activateCleanerAccount } from '@/lib/cleaner-integrations';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';
import { validateEmail, validatePhone, validateSaIdNumber, validateSaPassport } from '@/lib/validation';
import { log } from '@/lib/logger';

// Lets an admin who has already verified someone in person (ID checked,
// no need to wait for a self-service application) create a fully active
// cleaner account in one step. Records a `new_joiners` row too, already
// marked approved, so every cleaner - self-applied or admin-added - has
// exactly one history record and goes through the same account-activation
// path (see activateCleanerAccount).
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const adminUserId = (user as any).id || (user as any).userId || (user as any).user_id;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const body = await request.json() as {
      name?: string;
      id_number?: string;
      email?: string;
      phone?: string;
      address?: string;
      emergency_contact?: string;
    };
    const { name, id_number, phone } = body;
    const email = body.email?.trim() || `${(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}@scratch.local`;
    const address = body.address?.trim() || 'To be updated';
    const emergencyContact = body.emergency_contact?.trim() || '';

    if (!name || !id_number || !phone) {
      const response = NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, ID/passport number, and phone are required' }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      const response = NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: phoneValidation.errors.join(', ') }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    if (body.email) {
      const emailValidation = validateEmail(body.email);
      if (!emailValidation.valid) {
        const response = NextResponse.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: emailValidation.errors.join(', ') }
        }, { status: 400 });
        return withSecurityHeaders(response, traceId);
      }
    }

    const idValidation = validateSaIdNumber(id_number);
    const passportValidation = validateSaPassport(id_number);
    if (!idValidation.valid && !passportValidation.valid) {
      const response = NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Must be a valid South African ID number or passport number' }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existingEmail) {
      const response = NextResponse.json({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: 'A user with this email already exists' }
      }, { status: 409 });
      return withSecurityHeaders(response, traceId);
    }

    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN position_applied_for TEXT`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN erpnext_employee_id TEXT`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN approved_by INTEGER`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN approved_at DATETIME`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN updated_at DATETIME`).run().catch(() => {});

    const {
      paysheetCode,
      erpEmployeeResult,
      payrollSetupResult,
      notificationResult,
    } = await activateCleanerAccount(db, {
      name,
      email,
      phone,
      emergencyContact,
      idNumber: id_number,
      bankDetailsPresent: false,
    }, traceId);

    // Keep one history record per cleaner regardless of how they joined.
    const joinerResult = await db.prepare(
      `INSERT INTO new_joiners (
        name, id_number, email, phone, whatsapp, address, emergency_contact,
        status, position_applied_for, erpnext_employee_id, approved_by, approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 'Cleaner', ?, ?, datetime('now'), datetime('now'), datetime('now'))`
    ).bind(
      name,
      id_number,
      email,
      phone,
      phone,
      address,
      emergencyContact,
      paysheetCode,
      adminUserId
    ).run();

    log.audit('ADMIN_ADD_CLEANER', 'cleaner_application', {
      traceId,
      adminUserId,
      joinerId: joinerResult.meta.last_row_id,
      email,
      paysheetCode,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Cleaner account created successfully',
      data: {
        paysheetCode,
        status: 'consent_approved',
        integrations: {
          employee: erpEmployeeResult,
          payroll: payrollSetupResult,
          notifications: notificationResult,
        },
      }
    }, { status: 201 });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Add cleaner error:', error);
    log.error('Failed to add cleaner', error instanceof Error ? error : new Error(String(error)), { traceId, adminUserId });

    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create cleaner account',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
