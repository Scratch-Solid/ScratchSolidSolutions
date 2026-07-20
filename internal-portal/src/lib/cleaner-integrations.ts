import { log } from '@/lib/logger';
import { notifyAdminRejected, notifyConsentSubmitted, notifyContractSigned, sendCleanerWelcome } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { createEnvelope, getSigningUrl, isDocusignFullyConfigured } from '@/lib/docusign';
import { getCloudflareContext } from '@/lib/runtime-context';
import { logOnboardingTransition } from '@/lib/db';
import { ensureCleanerTrainingProgress, setCleanerOnboardingStage } from '@/lib/cleaner-training';
import type { D1Database } from '@cloudflare/workers-types';

export type StaffRole = 'digital' | 'transport';

export async function getErpNextCreds() {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
  return {
    baseUrl: (env as any)?.ERPNEXT_BASE_URL || (env as any)?.ERPNEXT_API_URL || process.env.ERPNEXT_BASE_URL || process.env.ERPNEXT_API_URL || undefined,
    apiKey: (env as any)?.ERPNEXT_API_KEY || process.env.ERPNEXT_API_KEY || undefined,
    apiSecret: (env as any)?.ERPNEXT_API_SECRET || process.env.ERPNEXT_API_SECRET || undefined,
  };
}

async function erpNextRequest(path: string, options: RequestInit = {}): Promise<any> {
  const creds = await getErpNextCreds();
  const { baseUrl, apiKey, apiSecret } = creds;

  if (!baseUrl || !apiKey || !apiSecret) {
    throw new Error('ERPNext credentials not configured');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api${path}`;
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Basic ${btoa(`${apiKey}:${apiSecret}`)}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`ERPNext API error (${response.status}): ${text}`);
  }

  return response.json().catch(() => null);
}

export type CleanerIntegrationResult = {
  provider: 'internal' | 'erpnext' | 'docusign' | 'notifications';
  status: 'configured' | 'skipped' | 'pending' | 'sent';
  reference?: string;
  reason?: string;
};

function buildReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function hasErpNextConfig() {
  const creds = await getErpNextCreds();
  return Boolean(creds.baseUrl && creds.apiKey && creds.apiSecret);
}

async function hasDocusignConfig() {
  return await isDocusignFullyConfigured();
}

export async function createOnboardingSignatureReference(
  traceId: string,
  step: 'consent' | 'contract',
  params?: {
    cleanerEmail?: string;
    cleanerName?: string;
    returnUrl?: string;
  }
) {
  const configured = await hasDocusignConfig();
  const prefix = step === 'consent' ? 'CONSENT' : 'CONTRACT';

  if (configured && step === 'contract' && params?.cleanerEmail && params?.cleanerName) {
    try {
      const contractHtml = buildEmploymentContractHtml(params.cleanerName);
      const envelope = await createEnvelope({
        subject: 'Scratch Solid Solutions — Employment Contract',
        emailBlurb: `Hi ${params.cleanerName},\n\nPlease review and sign your employment contract with Scratch Solid Solutions.\n\nBest regards,\nThe Scratch Solid Solutions Team`,
        documentName: 'Employment Contract',
        documentBase64: btoa(contractHtml),
        recipients: [
          {
            email: params.cleanerEmail,
            name: params.cleanerName,
            recipientId: '1',
            routingOrder: '1',
          },
        ],
      });

      const signingUrl = await getSigningUrl({
        envelopeId: envelope.envelopeId,
        recipientEmail: params.cleanerEmail,
        recipientName: params.cleanerName,
        returnUrl: params.returnUrl || 'https://portal.scratchsolidsolutions.org/onboarding/contract-complete',
      });

      log.audit('DOCUSIGN_CONTRACT_ENVELOPE_CREATED', 'cleaner_onboarding', {
        traceId,
        envelopeId: envelope.envelopeId,
        cleanerEmail: params.cleanerEmail,
        step,
      });

      return {
        signatureId: envelope.envelopeId,
        signingUrl,
        integration: {
          provider: 'docusign',
          status: 'sent',
          reference: envelope.envelopeId,
        } satisfies CleanerIntegrationResult,
      };
    } catch (error) {
      log.error('DOCUSIGN_CONTRACT_ENVELOPE_FAILED', error instanceof Error ? error : new Error(String(error)), {
        traceId,
        cleanerEmail: params.cleanerEmail,
        step,
      });

      // Fallback to internal reference on DocuSign failure
      const reference = buildReference(prefix);
      return {
        signatureId: reference,
        signingUrl: undefined,
        integration: {
          provider: 'internal',
          status: 'pending',
          reference,
          reason: error instanceof Error ? error.message : 'DocuSign envelope creation failed',
        } satisfies CleanerIntegrationResult,
      };
    }
  }

  const reference = configured ? buildReference(`DOCUSIGN_${prefix}`) : buildReference(prefix);

  log.audit('ONBOARDING_SIGNATURE_REFERENCE_CREATED', 'cleaner_onboarding', {
    traceId,
    provider: configured ? 'docusign' : 'internal',
    step,
    reference,
  });

  return {
    signatureId: reference,
    signingUrl: undefined,
    integration: {
      provider: configured ? 'docusign' : 'internal',
      status: configured ? 'configured' : 'pending',
      reference,
      reason: configured ? undefined : 'DocuSign credentials not configured',
    } satisfies CleanerIntegrationResult,
  };
}

function buildEmploymentContractHtml(cleanerName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Employment Contract</title>
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
h1 { text-align: center; }
.section { margin-bottom: 20px; }
.signature-block { margin-top: 40px; }
</style>
</head>
<body>
<h1>Employment Contract</h1>
<div class="section">
<p><strong>Between:</strong> Scratch Solid Solutions (Pty) Ltd<br>
<strong>And:</strong> ${cleanerName}</p>
</div>
<div class="section">
<h2>1. Position</h2>
<p>The Employee is engaged as a Cleaning Services Professional.</p>
</div>
<div class="section">
<h2>2. Term</h2>
<p>This contract is effective from the date of signature and continues until terminated in accordance with clause 5.</p>
</div>
<div class="section">
<h2>3. Duties</h2>
<p>The Employee shall perform cleaning services at client premises as assigned by the Employer.</p>
</div>
<div class="section">
<h2>4. Remuneration</h2>
<p>The Employee shall be paid in accordance with the paysheet code assigned upon approval.</p>
</div>
<div class="section">
<h2>5. Termination</h2>
<p>Either party may terminate this contract with 30 days written notice.</p>
</div>
<div class="signature-block">
<p><strong>Employer Signature:</strong> ##SIGN_HERE##</p>
<p><strong>Date:</strong> ##DATE_SIGNED##</p>
<p><strong>Employee Signature:</strong> ##SIGN_HERE##</p>
<p><strong>Date:</strong> ##DATE_SIGNED##</p>
</div>
</body>
</html>`;
}

export async function createSignupSignatureReference(traceId: string) {
  const configured = hasDocusignConfig();
  const reference = configured ? buildReference('DOCUSIGN') : buildReference('SIGNUP');

  log.audit('SIGNATURE_REFERENCE_CREATED', 'cleaner_application', {
    traceId,
    provider: configured ? 'docusign' : 'internal',
    reference,
  });

  return {
    signatureId: reference,
    integration: {
      provider: configured ? 'docusign' : 'internal',
      status: configured ? 'configured' : 'pending',
      reference,
      reason: configured ? undefined : 'DocuSign credentials not configured',
    } satisfies CleanerIntegrationResult,
  };
}

// Paysheet code format, per department - this is also the login username and
// (via its prefix) how a staff member's account is visually identifiable:
//   cleaner:   Scratch + 1 random capital letter + 4 digits   (e.g. ScratchY9472)
//   digital:   SolidDigital + 4 digits                        (e.g. SolidDigital9472)
//   transport: Trans + 1 random capital letter + 4 digits      (e.g. TransY9472)
// This replaced the older name-derived `abcX######` format (still valid/unchanged
// for existing cleaners - only NEW codes use this scheme) when generalizing
// account creation to Digital and Transportation staff.
function randomUpperLetter(): string {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
}

function randomDigits(count: number): string {
  const max = Math.pow(10, count);
  return Math.floor(Math.random() * max).toString().padStart(count, '0');
}

function generatePaysheetCode(role: 'cleaner' | 'staff' | StaffRole): string {
  switch (role) {
    case 'cleaner':
      return `Scratch${randomUpperLetter()}${randomDigits(4)}`;
    case 'staff':
      return `Supv${randomUpperLetter()}${randomDigits(4)}`;
    case 'digital':
      return `SolidDigital${randomDigits(4)}`;
    case 'transport':
      return `Trans${randomUpperLetter()}${randomDigits(4)}`;
  }
}

// Checks both staff.paysheet_code (cleaners/supervisors - formerly
// cleaner_profiles.paysheet_code, see migrations/067_consolidate_cleaner_profiles_into_staff.sql)
// and users.paysheet_code (digital/transport, which have no separate profile
// table) for collisions.
async function generateUniquePaysheetCode(db: D1Database, role: 'cleaner' | 'staff' | StaffRole): Promise<string> {
  // users.paysheet_code was intended to ship in migration 030, which never
  // actually applied on this environment (confirmed schema drift - see the
  // near-identical comment in activateStaffAccount). The collision check
  // below reads this column for every role, not just digital/transport, so
  // the defensive add has to live here rather than in just one caller -
  // this exact gap is what threw "no such column: paysheet_code" the first
  // time anyone used the admin quick-add-cleaner form in production.
  await db.prepare(`ALTER TABLE users ADD COLUMN paysheet_code TEXT`).run().catch(() => {});

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const code = generatePaysheetCode(role);
    const existing = await db.prepare(
      `SELECT 1 FROM staff WHERE paysheet_code = ?
       UNION SELECT 1 FROM users WHERE paysheet_code = ? LIMIT 1`
    ).bind(code, code).first();
    if (!existing) {
      return code;
    }
    attempts++;
  }

  // Fallback: append a timestamp suffix if all retries collided
  const fallbackSuffix = Date.now().toString().slice(-4);
  const base =
    role === 'cleaner' ? `Scratch${randomUpperLetter()}` :
    role === 'staff' ? `Supv${randomUpperLetter()}` :
    role === 'digital' ? 'SolidDigital' :
    `Trans${randomUpperLetter()}`;
  return `${base}${fallbackSuffix}`;
}

function generateTempPassword(): string {
  // Cross-runtime random bytes helper (Cloudflare Workers crypto vs Node.js crypto)
  const arr = new Uint8Array(18);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr);
  } else {
    const nodeCrypto = require('crypto');
    const buf = nodeCrypto.randomBytes(18);
    arr.set(buf);
  }
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Single entry point for turning a person (self-applied or admin-entered) into
 * a fully active cleaner account: user + staff profile row + training record +
 * onboarding_stage + ERPNext registration + welcome notification. Used by both
 * the application-approval route and the admin "add cleaner" route so there is
 * exactly one place this logic lives.
 *
 * Idempotent: if a prior call already created the `users` row but failed
 * before finishing (e.g. the staff insert or a later step threw), retrying
 * with the same email reuses that row instead of hitting the email UNIQUE
 * constraint and failing forever. A fresh temp password is issued on every
 * call so a recovered retry always ends with valid, deliverable credentials,
 * even if the original notification never went out.
 *
 * Writes to `staff`, not the now-legacy `cleaner_profiles` table - see
 * migrations/067_consolidate_cleaner_profiles_into_staff.sql.
 */
export async function activateCleanerAccount(
  db: D1Database,
  data: {
    name: string;
    email: string;
    phone: string;
    emergencyContact?: string;
    idNumber?: string;
    bankDetailsPresent?: boolean;
    // 'staff' = a supervisor: goes through the exact same staff-profile /
    // training / ERPNext activation as a cleaner (so they're assignable to
    // jobs and paid the same way), but the users.role that actually grants
    // supervisor-dashboard/API access is 'staff', not 'cleaner'.
    role?: 'cleaner' | 'staff';
  },
  traceId: string
) {
  const bcrypt = require('bcryptjs');
  const role = data.role || 'cleaner';

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const firstName = data.name.split(' ')[0] || data.name;
  const lastName = data.name.split(' ').slice(1).join(' ');

  const existingUser = await db.prepare(
    'SELECT id, role FROM users WHERE email = ?'
  ).bind(data.email).first<{ id: number; role: string }>();

  // The retry-reuse path below is only safe for a row THIS function itself
  // created on a prior, partially-failed attempt (i.e. already this exact
  // role). Without this guard, approving an application whose email happens
  // to match ANY existing account (admin, business, client) would silently
  // hijack that unrelated account - including overwriting its password -
  // which is exactly what happened on 2026-07-18 (a cleaner application
  // collided with the admin's own email and overwrote the admin's password).
  // Refuse instead.
  if (existingUser && existingUser.role !== role) {
    throw new Error(
      `An account with email ${data.email} already exists with role "${existingUser.role}". ` +
      `Refusing to activate a ${role} account over it - use a different email for this applicant, ` +
      `or resolve the conflict manually if this is expected.`
    );
  }

  let newUserId: number;
  let paysheetCode: string;

  if (existingUser) {
    newUserId = existingUser.id;
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, newUserId).run();

    const existingProfile = await db.prepare(
      'SELECT paysheet_code FROM staff WHERE user_id = ?'
    ).bind(newUserId).first<{ paysheet_code: string }>();

    if (existingProfile) {
      paysheetCode = existingProfile.paysheet_code;
    } else {
      paysheetCode = await generateUniquePaysheetCode(db, role);
      await db.prepare(
        `INSERT INTO staff (user_id, paysheet_code, first_name, last_name, cellphone, emergency_contact, emergency_phone, id_number, department, status, pool_type, onboarding_stage, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'cleaning', 'idle', 'INDIVIDUAL', 'consent_approved', datetime('now'), datetime('now'))`
      ).bind(
        newUserId,
        paysheetCode,
        firstName,
        lastName,
        data.phone,
        data.emergencyContact || '',
        data.phone,
        data.idNumber || ''
      ).run();
    }
  } else {
    paysheetCode = await generateUniquePaysheetCode(db, role);

    // Account is activated straight to consent_approved: approving/adding a
    // cleaner is now a single step, not "approve" here + a second "approve"
    // click on a different admin page before they can proceed.
    const insertResult = await db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, password_needs_reset, email_verified, onboarding_stage, created_at)
       VALUES (?, ?, ?, ?, ?, 1, 1, 'consent_approved', datetime('now'))`
    ).bind(data.name, data.email, passwordHash, role, data.phone).run();

    newUserId = insertResult.meta.last_row_id as number;

    await db.prepare(
      `INSERT INTO staff (user_id, paysheet_code, first_name, last_name, cellphone, emergency_contact, emergency_phone, id_number, department, status, pool_type, onboarding_stage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'cleaning', 'idle', 'INDIVIDUAL', 'consent_approved', datetime('now'), datetime('now'))`
    ).bind(
      newUserId,
      paysheetCode,
      firstName,
      lastName,
      data.phone,
      data.emergencyContact || '',
      data.phone,
      data.idNumber || ''
    ).run();
  }

  await ensureCleanerTrainingProgress(db, paysheetCode);
  await setCleanerOnboardingStage(db, newUserId, 'consent_approved');
  await logOnboardingTransition(db, {
    user_id: newUserId,
    to_stage: 'consent_approved',
    event_type: 'account_activated',
    metadata: { traceId },
  });

  const erpEmployeeResult = await registerCleanerInErpNext({
    traceId,
    employeeId: paysheetCode,
    firstName,
    lastName,
    email: data.email,
    phone: data.phone,
    department: 'Scratch',
    position: role === 'staff' ? 'Supervisor' : 'Cleaner',
  });
  const payrollSetupResult = await setupCleanerPayrollInErpNext({
    traceId,
    employeeId: paysheetCode,
    paysheetCode,
    bankDetailsPresent: Boolean(data.bankDetailsPresent),
  });
  const notificationResult = await notifyCleanerApproval({
    traceId,
    phone: data.phone,
    email: data.email,
    name: data.name,
    paysheetCode,
    tempPassword,
    db,
  });

  return {
    newUserId,
    paysheetCode,
    tempPassword,
    erpEmployeeResult,
    payrollSetupResult,
    notificationResult,
  };
}

/**
 * Single entry point for activating a Digital or Transportation staff account
 * from an approved application - the same role, and equivalent safety guard
 * against hijacking an unrelated existing account, as activateCleanerAccount,
 * without the cleaner-specific machinery (no `staff` profile row, no
 * training/ERPNext/DocuSign integration - none of that exists for these
 * departments yet). The paysheet code lives directly on `users.paysheet_code`
 * since this path doesn't create a `staff` row at all.
 */
export async function activateStaffAccount(
  db: D1Database,
  role: StaffRole,
  data: { name: string; email: string; phone?: string },
  traceId: string
) {
  const bcrypt = require('bcryptjs');

  // users.paysheet_code/department were intended to ship in migration 030,
  // which never actually applied on this environment (confirmed schema
  // drift) - add them defensively here, same pattern already used elsewhere
  // in this file/route for schema evolution that can't rely on migrations
  // having run.
  await db.prepare(`ALTER TABLE users ADD COLUMN paysheet_code TEXT`).run().catch(() => {});
  await db.prepare(`ALTER TABLE users ADD COLUMN department TEXT`).run().catch(() => {});

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const existingUser = await db.prepare(
    'SELECT id, role FROM users WHERE email = ?'
  ).bind(data.email).first<{ id: number; role: string }>();

  // Same reasoning as activateCleanerAccount's guard: refuse to reuse an
  // existing account unless it already has this exact role.
  if (existingUser && existingUser.role !== role) {
    throw new Error(
      `An account with email ${data.email} already exists with role "${existingUser.role}". ` +
      `Refusing to activate a ${role} account over it - use a different email for this applicant, ` +
      `or resolve the conflict manually if this is expected.`
    );
  }

  let newUserId: number;
  let paysheetCode: string;

  if (existingUser) {
    newUserId = existingUser.id;
    paysheetCode = (await db.prepare('SELECT paysheet_code FROM users WHERE id = ?').bind(newUserId).first<{ paysheet_code: string | null }>())?.paysheet_code || '';
    if (!paysheetCode) {
      paysheetCode = await generateUniquePaysheetCode(db, role);
    }
    await db.prepare(
      'UPDATE users SET password_hash = ?, paysheet_code = ?, department = ? WHERE id = ?'
    ).bind(passwordHash, paysheetCode, role, newUserId).run();
  } else {
    paysheetCode = await generateUniquePaysheetCode(db, role);
    const insertResult = await db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, paysheet_code, department, password_needs_reset, email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))`
    ).bind(data.name, data.email, passwordHash, role, data.phone || '', paysheetCode, role).run();
    newUserId = insertResult.meta.last_row_id as number;
  }

  await logOnboardingTransition(db, {
    user_id: newUserId,
    to_stage: 'active',
    event_type: 'account_activated',
    metadata: { traceId, role },
  });

  const notificationResult = await notifyStaffApproval({
    traceId,
    email: data.email,
    name: data.name,
    role,
    paysheetCode,
    tempPassword,
  });

  return { newUserId, paysheetCode, tempPassword, notificationResult };
}

export async function notifyStaffApproval(params: {
  traceId: string;
  email: string;
  name: string;
  role: StaffRole;
  paysheetCode: string;
  tempPassword: string;
}) {
  const departmentLabel = params.role === 'digital' ? 'Digital' : 'Transportation';
  const result = await sendEmail({
    to: params.email,
    subject: `Welcome to Scratch Solid Solutions - ${departmentLabel}`,
    html: `<p>Hi ${params.name},</p>
<p>Your application to join the ${departmentLabel} team has been approved. Here's how to log in to the staff portal:</p>
<p><strong>Portal:</strong> https://portal.scratchsolidsolutions.org/auth/login<br/>
<strong>Username (paysheet code):</strong> ${params.paysheetCode}<br/>
<strong>Temporary password:</strong> ${params.tempPassword}</p>
<p>You'll be asked to change your password on first login.</p>
<p>Welcome aboard!<br/>Scratch Solid Solutions</p>`,
    text: `Hi ${params.name}, your application to join the ${departmentLabel} team has been approved. Portal: https://portal.scratchsolidsolutions.org/auth/login - Username (paysheet code): ${params.paysheetCode} - Temporary password: ${params.tempPassword}. You'll be asked to change your password on first login.`,
  });

  log.audit('APPROVAL_NOTIFICATION', 'staff_application', {
    traceId: params.traceId,
    email: params.email,
    role: params.role,
    paysheetCode: params.paysheetCode,
    emailSuccess: result.success,
  });

  return {
    provider: 'notifications',
    status: result.success ? 'sent' : 'pending',
    reference: params.paysheetCode,
    reason: result.error,
  } satisfies CleanerIntegrationResult;
}

export async function registerCleanerInErpNext(params: {
  traceId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
}) {
  if (!(await hasErpNextConfig())) {
    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: 'ERPNext credentials not configured',
    } satisfies CleanerIntegrationResult;
  }

  try {
    const result = await erpNextRequest('/resource/Employee', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          employee_number: params.employeeId,
          first_name: params.firstName,
          last_name: params.lastName,
          email: params.email,
          cell_number: params.phone,
          department: params.department,
          designation: params.position,
          status: 'Active',
          date_of_joining: new Date().toISOString().split('T')[0],
        },
      }),
    });

    log.audit('ERP_EMPLOYEE_CREATED', 'cleaner_application', {
      traceId: params.traceId,
      employeeId: params.employeeId,
      erpnextName: result?.data?.name,
    });

    return {
      provider: 'erpnext',
      status: 'configured',
      reference: result?.data?.name || params.employeeId,
    } satisfies CleanerIntegrationResult;
  } catch (error) {
    log.error('ERP_EMPLOYEE_CREATE_FAILED', error instanceof Error ? error : new Error(String(error)), {
      traceId: params.traceId,
      employeeId: params.employeeId,
    });

    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: error instanceof Error ? error.message : 'ERPNext employee creation failed',
    } satisfies CleanerIntegrationResult;
  }
}

export async function createShiftAssignmentInErpNext(params: {
  traceId: string;
  employeeId: string;
  shiftType: string;
  startDate: string;
  endDate?: string;
  jobReference?: string;
}) {
  if (!(await hasErpNextConfig())) {
    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: 'ERPNext credentials not configured',
    } satisfies CleanerIntegrationResult;
  }

  try {
    const result = await erpNextRequest('/resource/Shift Assignment', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          employee: params.employeeId,
          shift_type: params.shiftType,
          start_date: params.startDate,
          end_date: params.endDate || params.startDate,
          status: 'Active',
          custom_job_reference: params.jobReference || '',
        },
      }),
    });

    log.audit('ERP_SHIFT_CREATED', 'workforce_dispatch', {
      traceId: params.traceId,
      employeeId: params.employeeId,
      shiftName: result?.data?.name,
      jobReference: params.jobReference,
    });

    return {
      provider: 'erpnext',
      status: 'configured',
      reference: result?.data?.name || params.employeeId,
    } satisfies CleanerIntegrationResult;
  } catch (error) {
    log.error('ERP_SHIFT_CREATE_FAILED', error instanceof Error ? error : new Error(String(error)), {
      traceId: params.traceId,
      employeeId: params.employeeId,
    });

    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: error instanceof Error ? error.message : 'ERPNext shift creation failed',
    } satisfies CleanerIntegrationResult;
  }
}

export async function setupCleanerPayrollInErpNext(params: {
  traceId: string;
  employeeId: string;
  paysheetCode: string;
  bankDetailsPresent: boolean;
}) {
  if (!(await hasErpNextConfig())) {
    return {
      provider: 'erpnext',
      status: 'pending',
      reference: params.employeeId,
      reason: 'ERPNext payroll credentials not configured',
    } satisfies CleanerIntegrationResult;
  }

  if (!params.bankDetailsPresent) {
    return {
      provider: 'erpnext',
      status: 'skipped',
      reference: params.paysheetCode,
      reason: 'Bank details missing for payroll setup',
    } satisfies CleanerIntegrationResult;
  }

  // "Salary Structure Assignment" belongs to Frappe's separate HR app
  // (hrms), which isn't installed on this ERPNext site - only frappe/erpnext
  // are (confirmed via `bench list-apps` 2026-07-17). Calling this endpoint
  // doesn't just 500 - it throws an unhandled ImportError inside Frappe's
  // request handler that crashes the entire gunicorn process, taking down
  // ERPNext for every other service too (confirmed: this took ERPNext down
  // for an hour in production). Short-circuit until hrms is actually
  // installed, rather than risk sending this request again.
  return {
    provider: 'erpnext',
    status: 'pending',
    reference: params.paysheetCode,
    reason: 'Payroll setup requires the Frappe HR app (hrms), which is not yet installed on this ERPNext site',
  } satisfies CleanerIntegrationResult;
}

export async function notifyCleanerApproval(params: {
  traceId: string;
  phone: string;
  email: string;
  name: string;
  paysheetCode: string;
  tempPassword: string;
  db?: D1Database;
}) {
  const result = await sendCleanerWelcome(params.phone, params.email, params.name, params.paysheetCode, params.tempPassword, undefined, params.db);
  log.audit('APPROVAL_NOTIFICATION', 'cleaner_application', {
    traceId: params.traceId,
    phone: params.phone,
    email: params.email,
    paysheetCode: params.paysheetCode,
    whatsappSuccess: result.whatsapp.success,
    whatsappSkipped: result.whatsapp.skipped,
    emailSuccess: result.email.success,
    emailSkipped: result.email.skipped,
  });

  return {
    provider: 'notifications',
    status: (result.whatsapp.success || result.email.success) ? 'sent' : (result.whatsapp.skipped && result.email.skipped) ? 'skipped' : 'pending',
    reference: params.paysheetCode,
    reason: result.whatsapp.error || result.email.error || result.whatsapp.skipReason || result.email.skipReason,
  } satisfies CleanerIntegrationResult;
}

export async function notifyCleanerRejection(params: {
  traceId: string;
  phone: string;
  name: string;
  reason?: string;
}) {
  const result = await notifyAdminRejected(params.phone, params.name, params.reason);
  log.audit('REJECTION_NOTIFICATION', 'cleaner_application', {
    traceId: params.traceId,
    phone: params.phone,
    success: result.success,
    skipped: result.skipped,
  });

  return {
    provider: 'notifications',
    status: result.success ? 'sent' : result.skipped ? 'skipped' : 'pending',
    reference: params.phone,
    reason: result.error || result.skipReason,
  } satisfies CleanerIntegrationResult;
}

export async function notifyCleanerConsent(params: {
  traceId: string;
  phone: string;
  name: string;
}) {
  const result = await notifyConsentSubmitted(params.phone, params.name);
  log.audit('CONSENT_NOTIFICATION', 'cleaner_onboarding', {
    traceId: params.traceId,
    phone: params.phone,
    success: result.success,
    skipped: result.skipped,
  });

  return {
    provider: 'notifications',
    status: result.success ? 'sent' : result.skipped ? 'skipped' : 'pending',
    reference: params.phone,
    reason: result.error || result.skipReason,
  } satisfies CleanerIntegrationResult;
}

export async function notifyCleanerContract(params: {
  traceId: string;
  phone: string;
  name: string;
}) {
  const result = await notifyContractSigned(params.phone, params.name);
  log.audit('CONTRACT_NOTIFICATION', 'cleaner_onboarding', {
    traceId: params.traceId,
    phone: params.phone,
    success: result.success,
    skipped: result.skipped,
  });

  return {
    provider: 'notifications',
    status: result.success ? 'sent' : result.skipped ? 'skipped' : 'pending',
    reference: params.phone,
    reason: result.error || result.skipReason,
  } satisfies CleanerIntegrationResult;
}
