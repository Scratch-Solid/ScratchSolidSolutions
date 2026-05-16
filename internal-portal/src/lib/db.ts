// Shared D1 Database Helper for Cloudflare Pages
// Both marketing-site and internal-portal use this same pattern

import { D1Database } from '@cloudflare/workers-types';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface Env {
  DB: D1Database;
}

// Helper to get the D1 database from the OpenNext Cloudflare context
export async function getDb(): Promise<D1Database | null> {
  try {
    // OpenNext on Workers: use getCloudflareContext
    const { env } = await getCloudflareContext({ async: true });
    const envAny = env as any;
    const db = envAny?.scratchsolid_db || envAny?.scratchsolidDb || envAny?.DB || envAny?.db || envAny?.database;
    if (db) {
      return db as D1Database;
    }
    // As a last resort, scan env for a D1-like binding (has prepare method)
    const candidateKey = Object.keys(envAny || {}).find((k) => {
      const val = (envAny as any)[k];
      return val && typeof val === 'object' && typeof (val as any).prepare === 'function';
    });
    if (candidateKey) {
      console.warn(`D1 binding not found under expected names; using candidate binding '${candidateKey}'`);
      return (envAny as any)[candidateKey] as D1Database;
    }
    console.error('D1 binding missing: expected scratchsolid_db or DB');
    console.error('Available env keys:', Object.keys(envAny || {}));
  } catch (error) {
    console.error('Error getting database from OpenNext context', error);
  }
  return null;
}

// User operations
export async function getUserByEmail(db: D1Database, email: string) {
  const result = await db.prepare('SELECT id, email, role, name, phone, address, business_name, password_hash, failed_attempts, locked_until FROM users WHERE email = ?').bind(email).first();
  return result;
}

export async function getUserById(db: D1Database, id: number) {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return result;
}

export async function createUser(db: D1Database, data: {
  email: string;
  password_hash: string;
  role: string;
  name: string;
  phone?: string;
  address?: string;
  business_name?: string;
  business_registration?: string;
}) {
  const result = await db.prepare(
    `INSERT INTO users (email, password_hash, role, name, phone, address, business_name, business_registration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(
    data.email, data.password_hash, data.role, data.name,
    data.phone || '', data.address || '', data.business_name || '', data.business_registration || ''
  ).first();
  return result;
}

export async function validateLogin(db: D1Database, email: string, password: string) {
  const user = await getUserByEmail(db, email);
  if (!user) return null;
  // Check account lockout
  if ((user as any).locked_until && new Date((user as any).locked_until) > new Date()) {
    return null; // Account is locked
  }
  const isValid = await bcrypt.compare(password, (user as any).password_hash);
  if (isValid) {
    await resetFailedAttempts(db, email);
    return user;
  }
  await incrementFailedAttempts(db, email);
  return null;
}

// Session operations
const MAX_CONCURRENT_SESSIONS = 3; // Maximum allowed concurrent sessions per user

export async function createSession(db: D1Database, userId: number, token: string, refreshToken?: string) {
  // Enforce concurrent session limit
  const existingSessions = await db.prepare(
    'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND expires_at > datetime("now")'
  ).bind(userId).first();
  
  const sessionCount = (existingSessions as any)?.count || 0;
  if (sessionCount >= MAX_CONCURRENT_SESSIONS) {
    // Delete oldest session(s) to make room
    await db.prepare(
      `DELETE FROM sessions WHERE user_id = ? AND expires_at > datetime("now") 
       ORDER BY created_at ASC LIMIT ?`
    ).bind(userId, sessionCount - MAX_CONCURRENT_SESSIONS + 1).run();
  }

  await db.prepare(
    `INSERT INTO sessions (user_id, token, refresh_token, expires_at) VALUES (?, ?, ?, datetime('now', '+24 hours'))`
  ).bind(userId, token, refreshToken || null).run();
}

export async function getUserSessions(db: D1Database, userId: number) {
  const result = await db.prepare(
    'SELECT * FROM sessions WHERE user_id = ? AND expires_at > datetime("now") ORDER BY created_at DESC'
  ).bind(userId).all();
  return result.results;
}

export async function revokeAllUserSessions(db: D1Database, userId: number, exceptToken?: string) {
  if (exceptToken) {
    await db.prepare(
      'DELETE FROM sessions WHERE user_id = ? AND token != ?'
    ).bind(userId, exceptToken).run();
  } else {
    await db.prepare(
      'DELETE FROM sessions WHERE user_id = ?'
    ).bind(userId).run();
  }
}

export async function createRefreshToken(db: D1Database, userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await db.prepare(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+30 days'))`
  ).bind(userId, token).run();
  return token;
}

export async function validateRefreshToken(db: D1Database, token: string) {
  const session = await db.prepare(
    `SELECT rt.*, u.email, u.role, u.name FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token = ? AND rt.expires_at > datetime('now') AND rt.revoked = 0`
  ).bind(token).first();
  return session;
}

export async function revokeRefreshToken(db: D1Database, token: string) {
  await db.prepare('UPDATE refresh_tokens SET revoked = 1, revoked_at = datetime("now") WHERE token = ?').bind(token).run();
}

// Account lockout operations
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export async function incrementFailedAttempts(db: D1Database, email: string): Promise<number> {
  const user = await getUserByEmail(db, email);
  if (!user) return 0;
  const attempts = ((user as any).failed_attempts || 0) + 1;
  const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? `datetime('now', '+${LOCKOUT_DURATION_MINUTES} minutes')` : (user as any).locked_until;
  await db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE email = ?')
    .bind(attempts, lockedUntil || null, email).run();
  return attempts;
}

export async function resetFailedAttempts(db: D1Database, email: string) {
  await db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE email = ?').bind(email).run();
}

export async function isAccountLocked(db: D1Database, identifier: string): Promise<boolean> {
  // Try email first
  let user = await getUserByEmail(db, identifier);
  // If not found, try phone
  if (!user) {
    user = await db.prepare('SELECT id, email, role, name, phone, address, business_name, failed_attempts, locked_until FROM users WHERE phone = ?').bind(identifier).first();
  }
  if (!user) return false;
  if ((user as any).locked_until && new Date((user as any).locked_until) > new Date()) return true;
  return false;
}

export async function getRemainingLockoutTime(db: D1Database, identifier: string): Promise<number | null> {
  let user = await getUserByEmail(db, identifier);
  if (!user) {
    user = await db.prepare('SELECT id, email, role, name, phone, address, business_name, failed_attempts, locked_until FROM users WHERE phone = ?').bind(identifier).first();
  }
  if (!user || !(user as any).locked_until) return null;
  
  const lockoutUntil = new Date((user as any).locked_until);
  const now = new Date();
  if (lockoutUntil <= now) return null;
  
  return Math.ceil((lockoutUntil.getTime() - now.getTime()) / 1000 / 60); // Return minutes remaining
}

export async function validateSession(db: D1Database, token: string) {
  const session = await db.prepare(
    `SELECT s.*, u.email, u.role, u.name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(token).first();
  return session;
}

export async function deleteSession(db: D1Database, token: string) {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

// Cleaner profile operations
export async function getCleanerProfileByUsername(db: D1Database, username: string) {
  const result = await db.prepare('SELECT * FROM cleaner_profiles WHERE username = ?').bind(username).first();
  return result;
}

export async function getCleanerProfileByUserId(db: D1Database, userId: number) {
  const result = await db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').bind(userId).first();
  return result;
}

export async function createCleanerProfile(db: D1Database, data: {
  user_id: number;
  username: string;
  paysheet_code?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
}) {
  const result = await db.prepare(
    `INSERT INTO cleaner_profiles (user_id, username, paysheet_code, first_name, last_name, department)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(data.user_id, data.username, data.paysheet_code || '', data.first_name || '', data.last_name || '', data.department || 'cleaning').first();
  return result;
}

export async function updateCleanerProfile(db: D1Database, username: string, data: Record<string, any>) {
  const ALLOWED_FIELDS = ['first_name', 'last_name', 'department', 'paysheet_code', 'profile_picture', 'bio', 'specialties', 'phone', 'address'];
  const fields = Object.keys(data).filter(k => ALLOWED_FIELDS.includes(k));
  if (fields.length === 0) return null;
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => data[f]);
  values.push(username);
  
  const result = await db.prepare(
    `UPDATE cleaner_profiles SET ${setClause}, updated_at = datetime('now') WHERE username = ? RETURNING *`
  ).bind(...values).first();
  return result;
}

// Get cleaner public profile (for client dashboard sync)
export async function getCleanerPublicProfile(db: D1Database, cleanerId: number) {
  const result = await db.prepare(
    `SELECT first_name, last_name, profile_picture, residential_address, cellphone FROM cleaner_profiles WHERE user_id = ?`
  ).bind(cleanerId).first();
  return result;
}

// Pending contracts operations
export async function getPendingContracts(db: D1Database) {
  const result = await db.prepare('SELECT * FROM pending_contracts ORDER BY submitted_at DESC').all();
  return result.results;
}

export async function getPendingContractById(db: D1Database, id: number) {
  const result = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(id).first();
  return result;
}

const PENDING_CONTRACT_ALLOWED_FIELDS = new Set([
  'full_name','email','phone','id_number','address','position','department',
  'start_date','contract_type','status','submitted_at','consent_given',
  'signature','notes','user_id'
]);

export async function createPendingContract(db: D1Database, data: Record<string, any>) {
  const fields = Object.keys(data).filter(k => PENDING_CONTRACT_ALLOWED_FIELDS.has(k));
  if (fields.length === 0) throw new Error('No valid fields provided for pending contract');
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(f => data[f]);
  
  const result = await db.prepare(
    `INSERT INTO pending_contracts (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
  ).bind(...values).first();
  return result;
}

export async function updatePendingContractStatus(db: D1Database, id: number, status: string) {
  const result = await db.prepare(
    `UPDATE pending_contracts SET status = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(status, id).first();
  return result;
}

export async function deletePendingContract(db: D1Database, id: number) {
  await db.prepare('DELETE FROM pending_contracts WHERE id = ?').bind(id).run();
}

// Employee operations
export async function getEmployees(db: D1Database) {
  const result = await db.prepare('SELECT * FROM employees ORDER BY created_at DESC').all();
  return result.results;
}

const EMPLOYEE_ALLOWED_FIELDS = new Set([
  'user_id','email','name','phone','id_number','address','position','department',
  'paysheet_code','start_date','employment_type','status','emergency_contact',
  'emergency_phone','bank_name','bank_account','bank_branch','notes'
]);

export async function createEmployee(db: D1Database, data: Record<string, any>) {
  const fields = Object.keys(data).filter(k => EMPLOYEE_ALLOWED_FIELDS.has(k));
  if (fields.length === 0) throw new Error('No valid fields provided for employee');
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(f => data[f]);
  
  const result = await db.prepare(
    `INSERT INTO employees (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
  ).bind(...values).first();
  return result;
}


// Booking operations
export async function createBooking(db: D1Database, data: {
  client_id: number;
  client_name: string;
  location: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  special_instructions?: string;
  booking_type?: string;
}) {
  const result = await db.prepare(
    `INSERT INTO bookings (client_id, client_name, location, service_type, booking_date, booking_time, special_instructions, booking_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(data.client_id, data.client_name, data.location, data.service_type, data.booking_date, data.booking_time, data.special_instructions || '', data.booking_type || 'standard').first();
  return result;
}

export async function getBookingsByClient(db: D1Database, clientId: number) {
  const result = await db.prepare('SELECT * FROM bookings WHERE client_id = ? ORDER BY booking_date DESC').bind(clientId).all();
  return result.results;
}

export async function getBookingsByCleaner(db: D1Database, cleanerId: number) {
  const result = await db.prepare('SELECT * FROM bookings WHERE cleaner_id = ? ORDER BY booking_date DESC').bind(cleanerId).all();
  return result.results;
}

export async function updateBookingStatus(db: D1Database, bookingId: number, status: string) {
  const result = await db.prepare(
    `UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(status, bookingId).first();
  return result;
}

export async function assignBookingToCleaner(db: D1Database, bookingId: number, cleanerId: number) {
  const result = await db.prepare(
    `UPDATE bookings SET cleaner_id = ?, status = 'assigned', updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(cleanerId, bookingId).first();
  return result;
}

// Task completion / earnings
export async function recordTaskCompletion(db: D1Database, bookingId: number, cleanerId: number, earnings: number = 150) {
  const result = await db.prepare(
    `INSERT INTO task_completions (booking_id, cleaner_id, earnings) VALUES (?, ?, ?) RETURNING *`
  ).bind(bookingId, cleanerId, earnings).first();
  return result;
}

export async function getCleanerEarnings(db: D1Database, cleanerId: number) {
  const result = await db.prepare(
    `SELECT COALESCE(SUM(earnings), 0) as total_earnings, COUNT(*) as completed_jobs FROM task_completions WHERE cleaner_id = ?`
  ).bind(cleanerId).first();
  return result;
}

// Email verification functions
export async function createEmailVerificationToken(db: D1Database, userId: number, email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.prepare(
    `UPDATE users SET email_verification_token = ?, email_verification_expires = ?, email_verification_sent_at = ? WHERE id = ?`
  ).bind(token, expires.toISOString(), new Date().toISOString(), userId).run();
  
  return token;
}

export async function verifyEmailToken(db: D1Database, token: string) {
  const user = await db.prepare(
    `SELECT id, email FROM users WHERE email_verification_token = ? AND email_verification_expires > datetime('now')`
  ).bind(token).first();
  
  if (user) {
    await db.prepare(
      `UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?`
    ).bind((user as any).id).run();
    return user;
  }
  
  return null;
}

export async function isEmailVerified(db: D1Database, userId: number): Promise<boolean> {
  const result = await db.prepare('SELECT email_verified FROM users WHERE id = ?').bind(userId).first();
  return (result as any)?.email_verified === 1;
}

// Admin approval functions
export async function createAdminApprovalRequest(db: D1Database, userId: number, registrationIp?: string, userAgent?: string) {
  await db.prepare(
    `UPDATE users SET admin_approval_status = 'pending', registration_ip = ?, registration_user_agent = ? WHERE id = ?`
  ).bind(registrationIp || '', userAgent || '', userId).run();
}

export async function approveAdminUser(db: D1Database, userId: number, approvedBy: number, notes?: string) {
  await db.prepare(
    `UPDATE users SET admin_approval_status = 'approved', approved_by = ?, approved_at = ?, approval_notes = ? WHERE id = ?`
  ).bind(approvedBy, new Date().toISOString(), notes || '', userId).run();
}

export async function rejectAdminUser(db: D1Database, userId: number, rejectedBy: number, notes?: string) {
  await db.prepare(
    `UPDATE users SET admin_approval_status = 'rejected', approved_by = ?, approved_at = ?, approval_notes = ? WHERE id = ?`
  ).bind(rejectedBy, new Date().toISOString(), notes || '', userId).run();
}

export async function getPendingAdminApprovals(db: D1Database) {
  const result = await db.prepare(
    `SELECT id, email, name, role, created_at, registration_ip FROM users 
     WHERE role IN ('admin', 'super_admin') AND admin_approval_status = 'pending' AND email_verified = 1`
  ).all();
  return result.results;
}

export async function isAdminApproved(db: D1Database, userId: number): Promise<boolean> {
  const result = await db.prepare('SELECT admin_approval_status FROM users WHERE id = ?').bind(userId).first();
  return (result as any)?.admin_approval_status === 'approved';
}

// Audit logging functions
export async function logAuditEvent(db: D1Database, event: {
  user_id?: number;
  action: string;
  resource?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  success?: boolean;
  error_message?: string;
  session_id?: string;
  trace_id?: string;
}) {
  await db.prepare(
    `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent, details, success, error_message, session_id, trace_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    event.user_id || null,
    event.action,
    event.resource || null,
    event.resource_id || null,
    event.ip_address || null,
    event.user_agent || null,
    event.details || null,
    event.success ? 1 : 0,
    event.error_message || null,
    event.session_id || null,
    event.trace_id || null
  ).run();
}

export async function getAuditLogs(db: D1Database, filters?: {
  user_id?: number;
  action?: string;
  resource?: string;
  limit?: number;
  offset?: number;
}) {
  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const params: any[] = [];
  
  if (filters?.user_id) {
    query += ` AND user_id = ?`;
    params.push(filters.user_id);
  }
  
  if (filters?.action) {
    query += ` AND action = ?`;
    params.push(filters.action);
  }
  
  if (filters?.resource) {
    query += ` AND resource = ?`;
    params.push(filters.resource);
  }
  
  query += ` ORDER BY timestamp DESC`;
  
  if (filters?.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
    
    if (filters?.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }
  
  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

// Enhanced user tracking functions
export async function updateUserLoginStats(db: D1Database, userId: number, success: boolean, ip?: string) {
  if (success) {
    await db.prepare(
      `UPDATE users SET login_count = COALESCE(login_count, 0) + 1, last_login = ?, failed_login_attempts = 0 WHERE id = ?`
    ).bind(new Date().toISOString(), userId).run();
  } else {
    await db.prepare(
      `UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, last_failed_login = ? WHERE id = ?`
    ).bind(new Date().toISOString(), userId).run();
  }
}

export async function getUserLoginStats(db: D1Database, userId: number) {
  const result = await db.prepare(
    `SELECT login_count, last_login, failed_login_attempts, last_failed_login FROM users WHERE id = ?`
  ).bind(userId).first();
  return result;
}

// 2FA functions
export async function createTOTPSecret(db: D1Database, userId: number): Promise<string> {
  const secret = crypto.randomBytes(20).toString('hex');
  await db.prepare(
    `UPDATE users SET totp_secret = ? WHERE id = ?`
  ).bind(secret, userId).run();
  return secret;
}

export async function enableTOTP(db: D1Database, userId: number, secret: string, backupCodes: string[]): Promise<void> {
  await db.prepare(
    `UPDATE users SET totp_secret = ?, totp_enabled = 1, backup_codes = ? WHERE id = ?`
  ).bind(secret, JSON.stringify(backupCodes), userId).run();
}

export async function disableTOTP(db: D1Database, userId: number): Promise<void> {
  await db.prepare(
    `UPDATE users SET totp_secret = NULL, totp_enabled = 0, backup_codes = NULL WHERE id = ?`
  ).bind(userId).run();
}

export async function getUserTOTPSecret(db: D1Database, userId: number): Promise<string | null> {
  const result = await db.prepare(
    `SELECT totp_secret FROM users WHERE id = ? AND totp_enabled = 1`
  ).bind(userId).first();
  return (result as any)?.totp_secret || null;
}

export async function isTOTPEnabled(db: D1Database, userId: number): Promise<boolean> {
  const result = await db.prepare(
    `SELECT totp_enabled FROM users WHERE id = ?`
  ).bind(userId).first();
  return (result as any)?.totp_enabled === 1;
}

export async function getBackupCodes(db: D1Database, userId: number): Promise<string[]> {
  const result = await db.prepare(
    `SELECT backup_codes FROM users WHERE id = ? AND totp_enabled = 1`
  ).bind(userId).first();
  if ((result as any)?.backup_codes) {
    return JSON.parse((result as any).backup_codes);
  }
  return [];
}

export async function useBackupCode(db: D1Database, userId: number, code: string): Promise<boolean> {
  const user = await db.prepare(
    `SELECT backup_codes FROM users WHERE id = ? AND totp_enabled = 1`
  ).bind(userId).first();

  if (!user || !(user as any).backup_codes) {
    return false;
  }

  const backupCodes = JSON.parse((user as any).backup_codes) as string[];
  const codeIndex = backupCodes.indexOf(code);

  if (codeIndex === -1) {
    return false;
  }

  // Remove used backup code
  backupCodes.splice(codeIndex, 1);
  await db.prepare(
    `UPDATE users SET backup_codes = ? WHERE id = ?`
  ).bind(JSON.stringify(backupCodes), userId).run();

  return true;
}
