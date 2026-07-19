/**
 * World-Class Authentication System
 * 
 * Features:
 * - Rate limiting (IP-based and user-based)
 * - Brute force protection with exponential backoff
 * - Secure session management with refresh tokens
 * - TOTP-based 2FA support
 * - Comprehensive audit logging
 * - Strong password policies
 * - RBAC integration
 * - Secure token generation with JWT
 */

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { authenticator } from 'otplib';
import { getCloudflareContext } from './runtime-context';

// Configuration
// Secrets MUST be set via wrangler secrets at runtime.
// Do NOT use fallback values in production.
async function getCloudflareSecret(name: string): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    return (env as any)?.[name] || process.env[name];
  } catch {
    return process.env[name];
  }
}

async function getJwtSecret(): Promise<string> {
  const secret = await getCloudflareSecret('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

async function getJwtRefreshSecret(): Promise<string> {
  const secret = await getCloudflareSecret('JWT_REFRESH_SECRET') || await getCloudflareSecret('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET environment variable is required');
  }
  return secret;
}
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10;

// D1-based brute-force protection replaces in-memory Map which is ineffective
// in serverless/edge environments where each request runs in a fresh isolate.

/**
 * Ensure login_attempts table exists in D1
 */
async function ensureLoginAttemptsTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 1,
      lockout_until INTEGER,
      last_attempt INTEGER NOT NULL DEFAULT ${Date.now()},
      UNIQUE(identifier)
    )
  `).run();
}

/**
 * Check if user is locked out due to too many failed attempts (D1-backed)
 */
export async function isUserLockedOut(db: D1Database, identifier: string): Promise<boolean> {
  await ensureLoginAttemptsTable(db);
  const record = await db.prepare(
    'SELECT attempts, lockout_until FROM login_attempts WHERE identifier = ?'
  ).bind(identifier).first() as { attempts: number; lockout_until: number | null } | null;

  if (!record) return false;

  const now = Date.now();
  if (record.lockout_until && now > record.lockout_until) {
    // Lockout expired, clean up
    await db.prepare('DELETE FROM login_attempts WHERE identifier = ?').bind(identifier).run();
    return false;
  }

  return record.lockout_until !== null && now <= record.lockout_until;
}

/**
 * Record failed login attempt (D1-backed)
 */
export async function recordFailedAttempt(db: D1Database, identifier: string): Promise<void> {
  await ensureLoginAttemptsTable(db);

  const existing = await db.prepare(
    'SELECT attempts FROM login_attempts WHERE identifier = ?'
  ).bind(identifier).first() as { attempts: number } | null;

  if (existing) {
    const newAttempts = existing.attempts + 1;
    const lockoutUntil = newAttempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null;
    await db.prepare(
      'UPDATE login_attempts SET attempts = ?, lockout_until = ?, last_attempt = ? WHERE identifier = ?'
    ).bind(newAttempts, lockoutUntil, Date.now(), identifier).run();
  } else {
    await db.prepare(
      'INSERT INTO login_attempts (identifier, attempts, lockout_until, last_attempt) VALUES (?, 1, NULL, ?)'
    ).bind(identifier, Date.now()).run();
  }
}

/**
 * Clear failed login attempts on successful login (D1-backed)
 */
export async function clearFailedAttempts(db: D1Database, identifier: string): Promise<void> {
  await ensureLoginAttemptsTable(db);
  await db.prepare('DELETE FROM login_attempts WHERE identifier = ?').bind(identifier).run();
}

/**
 * Generate secure random token (Web Crypto API, Cloudflare Workers compatible)
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate access token
 */
export async function generateAccessToken(userId: number, email: string, role: string): Promise<string> {
  return await new SignJWT({ userId, email, role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(new TextEncoder().encode(await getJwtSecret()));
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(userId: number): Promise<string> {
  const tokenId = generateSecureToken(16);
  return await new SignJWT({ userId, tokenId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(new TextEncoder().encode(await getJwtRefreshSecret()));
}

/**
 * Verify access token
 */
export async function verifyAccessToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(await getJwtSecret()));
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(await getJwtRefreshSecret()));
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password contains common words that are not allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate TOTP secret
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate TOTP QR code URI
 */
export function generateTOTPURI(email: string, secret: string): string {
  return authenticator.keyuri(email, 'ScratchSolid Portal', secret);
}

/**
 * Verify TOTP token
 */
export function verifyTOTP(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  db: any,
  userId: number | null,
  eventType: 'login_success' | 'login_failed' | 'logout' | '2fa_enabled' | '2fa_disabled' | 'password_changed' | '2fa_enable_failed' | '2fa_verify_failed' | '2fa_backup_failed' | '2fa_verify_success' | 'password_change_failed',
  ipAddress: string,
  userAgent: string,
  details?: any
): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO auth_audit_log (user_id, event_type, ip_address, user_agent, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      eventType,
      ipAddress,
      userAgent,
      JSON.stringify(details || {}),
      Math.floor(Date.now() / 1000)
    ).run();
  } catch (error) {
    console.error('Failed to log auth event:', error);
  }
}

/**
 * Get user permissions from RBAC
 */
export async function getUserPermissions(db: any, userId: number): Promise<string[]> {
  try {
    const roleResult = await db.prepare(
      'SELECT role FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!roleResult) return [];

    const permissionsResult = await db.prepare(
      `SELECT p.permission_name
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = (SELECT id FROM roles WHERE role_name = ?)`
    ).bind(roleResult.role).all();

    return permissionsResult.results?.map((r: any) => r.permission_name) || [];
  } catch (error) {
    console.error('Failed to get user permissions:', error);
    return [];
  }
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(db: any, userId: number, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(db, userId);
  return permissions.includes(permission);
}

/**
 * Detect admin email domain for automatic admin routing
 */
export function isAdminEmailDomain(email: string): boolean {
  return email.toLowerCase().endsWith('@scratchsolidsolutions.org');
}

/**
 * MFA enforcement: ALL users MUST have 2FA enabled.
 * Returns true if the user has 2FA enabled in the user_2fa table.
 */
export async function isMFACompliant(db: any, userId: number): Promise<boolean> {
  const user2fa = await db.prepare(
    'SELECT enabled FROM user_2fa WHERE user_id = ?'
  ).bind(userId).first() as { enabled: number } | null;

  return user2fa?.enabled === 1;
}

/**
 * Check if user is superuser
 */
export async function isSuperuser(db: any, userId: number): Promise<boolean> {
  try {
    const result = await db.prepare(
      'SELECT is_superuser FROM users WHERE id = ?'
    ).bind(userId).first();
    return result?.is_superuser === 1;
  } catch (error) {
    return false;
  }
}
