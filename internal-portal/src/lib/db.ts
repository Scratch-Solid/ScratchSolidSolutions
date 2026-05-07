// Shared D1 Database Helper for Cloudflare Pages
// Both marketing-site and internal-portal use this same pattern

import { D1Database } from '@cloudflare/workers-types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface Env {
  scratchsolid_db: D1Database;
}

// Helper to get the D1 database from the OpenNext Cloudflare context
export async function getDb(): Promise<D1Database | null> {
  try {
    // OpenNext on Workers: use getCloudflareContext
    const { env } = await getCloudflareContext({ async: true });
    if (env?.scratchsolid_db) {
      return env.scratchsolid_db as D1Database;
    }
  } catch (error) {
    console.error('Error getting database from OpenNext context', error);
  }
  return null;
}

// Input sanitization utilities
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().replace(/[^a-z0-9@._+-]/g, '').trim();
}

export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^0-9+\-() ]/g, '').trim();
}

// User operations
export async function getUserByEmail(db: D1Database, email: string) {
  const result = await db.prepare('SELECT id, email, role, name, phone, address, business_name, failed_attempts, locked_until FROM users WHERE email = ?').bind(email).first();
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

export async function createPendingContract(db: D1Database, data: Record<string, any>) {
  const fields = Object.keys(data);
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

export async function createEmployee(db: D1Database, data: Record<string, any>) {
  const fields = Object.keys(data);
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(f => data[f]);
  
  const result = await db.prepare(
    `INSERT INTO employees (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
  ).bind(...values).first();
  return result;
}

// Audit logging
export async function logAuditEvent(db: D1Database, adminId: number, action: string, resourceType: string, resourceId: number | null = null, details: string = '{}', ipAddress: string = ''): Promise<void> {
  await db.prepare(
    'INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(adminId, action, resourceType, resourceId, details, ipAddress).run();
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
