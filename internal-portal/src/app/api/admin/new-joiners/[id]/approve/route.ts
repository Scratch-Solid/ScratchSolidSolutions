export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureCleanerTrainingProgress, setCleanerOnboardingStage } from '@/lib/cleaner-training';
import { notifyCleanerApproval, registerCleanerInErpNext, setupCleanerPayrollInErpNext } from '@/lib/cleaner-integrations';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';
import crypto from 'crypto';

// Generate paysheet code from first name per spec: abcX#####
// Format: first 3 letters of first name (lowercase) + random uppercase letter + 4-6 random digits
function generatePaysheetCode(firstName: string): string {
  const normalized = firstName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 3);
  const randomUpper = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  const randomDigits = Math.floor(Math.random() * 900000 + 100000).toString(); // 100000-999999
  return `${normalized}${randomUpper}${randomDigits}`;
}

async function generateUniquePaysheetCode(db: D1Database, name: string): Promise<string> {
  const firstName = name.split(' ')[0] || name;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const code = generatePaysheetCode(firstName);
    const existing = await db.prepare(
      'SELECT 1 FROM cleaner_profiles WHERE paysheet_code = ? LIMIT 1'
    ).bind(code).first();
    if (!existing) {
      return code;
    }
    attempts++;
  }

  // Fallback: append timestamp suffix if all retries collided
  const fallbackSuffix = Date.now().toString().slice(-4);
  const firstNameBase = firstName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 3);
  const randomUpper = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${firstNameBase}${randomUpper}${fallbackSuffix}`;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const joinerId = parseInt(params.id);

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

    // Generate paysheet code (unique, with collision retry)
    const paysheetCode = await generateUniquePaysheetCode(db, joinerData.name);

    // Create user account
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, password_needs_reset, email_verified, onboarding_stage, created_at)
       VALUES (?, ?, ?, 'cleaner', ?, 1, 1, 'consent_pending', datetime('now'))`
    ).bind(
      joinerData.name,
      joinerData.email,
      passwordHash,
      joinerData.phone
    ).run();

    // Get the new user ID
    const newUser = await db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(joinerData.email).first();
    const newUserId = (newUser as any)?.id;

    // Create cleaner profile
    await db.prepare(
      `INSERT INTO cleaner_profiles (user_id, username, paysheet_code, first_name, last_name, cellphone, emergency_contact, emergency_phone, id_number, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      newUserId,
      paysheetCode,
      paysheetCode,
      joinerData.name.split(' ')[0] || joinerData.name,
      joinerData.name.split(' ').slice(1).join(' ') || '',
      joinerData.phone,
      joinerData.emergency_contact,
      joinerData.phone,
      joinerData.id_number
    ).run();

    // Create training progress record
    await ensureCleanerTrainingProgress(db, paysheetCode);
    await setCleanerOnboardingStage(db, Number(newUserId), 'consent_pending');

    const erpEmployeeResult = await registerCleanerInErpNext({
      traceId,
      employeeId: paysheetCode,
      firstName: joinerData.name.split(' ')[0] || joinerData.name,
      lastName: joinerData.name.split(' ').slice(1).join(' ') || '',
      email: joinerData.email,
      phone: joinerData.phone,
      department: 'Scratch',
      position: 'Cleaner',
    });
    const payrollSetupResult = await setupCleanerPayrollInErpNext({
      traceId,
      employeeId: paysheetCode,
      paysheetCode,
      bankDetailsPresent: Boolean(joinerData.bank_details),
    });
    const notificationResult = await notifyCleanerApproval({
      traceId,
      phone: joinerData.phone,
      email: joinerData.email,
      name: joinerData.name,
      paysheetCode,
      tempPassword,
    });

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
    log.error('Failed to approve application', error instanceof Error ? error : new Error(String(error)), { traceId, userId, joinerId: params.id });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to approve application',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
