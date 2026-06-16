export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureCleanerTrainingProgress, setCleanerOnboardingStage } from '@/lib/cleaner-training';
import { notifyCleanerApproval, registerCleanerInErpNext, setupCleanerPayrollInErpNext } from '@/lib/cleaner-integrations';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';
import { decryptField } from '@/lib/encryption';

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

    // Generate paysheet code (unique, with collision retry)
    const paysheetCode = await generateUniquePaysheetCode(db, joinerData.name);

    // Create user account
    // Cross-runtime random bytes helper (Cloudflare Workers crypto vs Node.js crypto)
    const tempPasswordBytes = (() => {
      const arr = new Uint8Array(18);
      if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
        crypto.getRandomValues(arr);
      } else {
        const nodeCrypto = require('crypto');
        const buf = nodeCrypto.randomBytes(18);
        arr.set(buf);
      }
      return arr;
    })();
    const tempPassword = Array.from(tempPasswordBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, password_needs_reset, email_verified, onboarding_stage, created_at)
       VALUES (?, ?, ?, 'cleaner', ?, 1, 1, 'consent_pending', datetime('now'))`
    ).bind(
      joinerData.name,
      joinerData.email,
      passwordHash,
      decryptedPhone
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
      decryptedPhone,
      decryptedEmergencyContact,
      decryptedPhone,
      decryptedIdNumber
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
      phone: decryptedPhone,
      department: 'Scratch',
      position: 'Cleaner',
    });
    const payrollSetupResult = await setupCleanerPayrollInErpNext({
      traceId,
      employeeId: paysheetCode,
      paysheetCode,
      bankDetailsPresent: Boolean(decryptedBankDetails),
    });
    const notificationResult = await notifyCleanerApproval({
      traceId,
      phone: decryptedPhone,
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
    log.error('Failed to approve application', error instanceof Error ? error : new Error(String(error)), { traceId, userId, joinerId: id });
    
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
