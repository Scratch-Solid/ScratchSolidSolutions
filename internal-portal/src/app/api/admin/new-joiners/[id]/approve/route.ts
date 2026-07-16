export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { activateCleanerAccount } from '@/lib/cleaner-integrations';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';
import { decryptField } from '@/lib/encryption';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  const { id } = await params;
  try {
    const joinerId = parseInt(id);

    // Check if joiner exists and is pending
    const joiner = await db.prepare(
      'SELECT * FROM new_joiners WHERE id = ? AND status = ?'
    ).bind(joinerId, 'pending').first();

    if (!joiner) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found or already processed',
          suggestion: 'The application may have been already approved or rejected'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const joinerData = joiner as any;

    // Decrypt sensitive fields from new_joiners
    const decryptedPhone = await decryptField(joinerData.phone) || joinerData.phone;
    const decryptedEmergencyContact = await decryptField(joinerData.emergency_contact) || joinerData.emergency_contact;
    const decryptedIdNumber = await decryptField(joinerData.id_number) || joinerData.id_number;
    const decryptedBankDetails = joinerData.bank_details ? (await decryptField(joinerData.bank_details) || joinerData.bank_details) : null;

    const {
      paysheetCode,
      erpEmployeeResult,
      payrollSetupResult,
      notificationResult,
    } = await activateCleanerAccount(db, {
      name: joinerData.name,
      email: joinerData.email,
      phone: decryptedPhone,
      emergencyContact: decryptedEmergencyContact,
      idNumber: decryptedIdNumber,
      bankDetailsPresent: Boolean(decryptedBankDetails),
    }, traceId);

    // Ensure approval tracking columns exist
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN erpnext_employee_id TEXT`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN approved_by INTEGER`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN approved_at DATETIME`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN updated_at DATETIME`).run().catch(() => {});

    // Update new_joiners status
    await db.prepare(
      `UPDATE new_joiners 
       SET status = 'approved', erpnext_employee_id = ?, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(paysheetCode, userId, joinerId).run();

    // Log audit event
    log.audit('APPROVE', 'cleaner_application', {
      traceId,
      userId,
      joinerId,
      applicantEmail: joinerData.email,
      paysheetCode
    });

    const response = NextResponse.json({
      success: true,
      message: 'Application approved successfully',
      data: {
        joinerId,
        paysheetCode,
        status: 'approved',
        integrations: {
          employee: erpEmployeeResult,
          payroll: payrollSetupResult,
          notifications: notificationResult,
        },
        next_steps: [
          'Employee account created',
          'Training progress initialized',
          'Notification sent to applicant with login credentials'
        ]
      }
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Application approval error:', error);
    log.error('Failed to approve application', error instanceof Error ? error : new Error(String(error)), { traceId, userId, joinerId: id });

    // The specific underlying error (a real DB/API failure reason) needs to
    // actually reach the admin, not just a generic placeholder - otherwise
    // every distinct failure looks identical and is undiagnosable from the UI.
    const detail = error instanceof Error ? error.message : 'Unknown error';
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to approve application: ${detail}`,
        details: {
          error: detail
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
