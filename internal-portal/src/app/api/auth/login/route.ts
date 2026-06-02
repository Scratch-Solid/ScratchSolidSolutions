export const dynamic = "force-dynamic";
/**
 * Enhanced Login Endpoint with Security Features
 * Phase 3.2: Enhanced API Security Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, logAuditEvent } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { 
  applySecurityMiddleware, 
  checkRateLimit, 
  getRateLimitHeaders, 
  createSecurityError,
  createRateLimitError
} from '@/lib/security-middleware';
import { recordFailedAttempt, isUserLockedOut, clearFailedAttempts } from '@/lib/auth';
import { generateAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/session';
import crypto from 'crypto';

 type LoginUser = {
   id: number;
   email: string;
   password_hash: unknown;
   role: string;
   name: string;
   phone: string;
   address: string;
   business_name: string;
   paysheet_code?: string;
   password_needs_reset?: number;
 };

 async function findUserForLogin(db: D1Database, identifier: string): Promise<LoginUser | null> {
   const directQueries = [
     {
       sql: 'SELECT id, email, password_hash, role, name, phone, address, business_name, paysheet_code, password_needs_reset FROM users WHERE email = ? OR phone = ? OR username = ? OR paysheet_code = ?',
       bind: [identifier, identifier, identifier, identifier],
     },
     {
       sql: 'SELECT id, email, password_hash, role, name, phone, address, business_name, NULL as paysheet_code, 0 as password_needs_reset FROM users WHERE email = ? OR phone = ? OR username = ?',
       bind: [identifier, identifier, identifier],
     },
     {
       sql: 'SELECT id, email, password_hash, role, name, phone, address, business_name, NULL as paysheet_code, 0 as password_needs_reset FROM users WHERE email = ? OR phone = ?',
       bind: [identifier, identifier],
     },
   ];

   for (const query of directQueries) {
     try {
       const user = await db.prepare(query.sql).bind(...query.bind).first() as LoginUser | null;
       if (user) {
         return user;
       }
     } catch {
     }
   }

   const cleanerQueries = [
     'SELECT u.id, u.email, u.password_hash, u.role, u.name, u.phone, u.address, u.business_name, cp.paysheet_code as paysheet_code, u.password_needs_reset FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.paysheet_code = ? OR cp.username = ?',
     'SELECT u.id, u.email, u.password_hash, u.role, u.name, u.phone, u.address, u.business_name, cp.paysheet_code as paysheet_code, 0 as password_needs_reset FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.paysheet_code = ? OR cp.username = ?',
     'SELECT u.id, u.email, u.password_hash, u.role, u.name, u.phone, u.address, u.business_name, cp.paysheet_code as paysheet_code, 0 as password_needs_reset FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.paysheet_code = ?',
   ];

   for (const sql of cleanerQueries) {
     try {
       const statement = sql.includes('OR cp.username = ?')
         ? db.prepare(sql).bind(identifier, identifier)
         : db.prepare(sql).bind(identifier);
       const user = await statement.first() as LoginUser | null;
       if (user) {
         return user;
       }
     } catch {
     }
   }

   return null;
 }

export async function POST(request: NextRequest) {
  // CRITICAL: Get DB BEFORE ANY other operation to ensure AsyncLocalStorage context is preserved
  const db = await getDb();
  if (!db) {
    return createSecurityError('Database unavailable', 503);
  }

  // CSRF protection - disabled for login endpoint
  // Note: CSRF on login is intentionally disabled because:
  // 1. Login is the initial authentication step where no session exists yet
  // 2. An attacker would need to know the user's credentials to exploit CSRF on login
  // 3. Implementing CSRF on login requires a separate unauthenticated endpoint to fetch tokens
  // 4. Rate limiting and login attempt tracking provide sufficient protection against brute force
  // If CSRF protection is needed, implement a separate /api/auth/csrf-token endpoint

  // Get client identifier for rate limiting
  const clientId = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'anonymous';

  // Check rate limit (auth endpoints have stricter limits)
  const rateLimitResult = checkRateLimit(clientId, 'auth');
  if (!rateLimitResult.allowed) {
    const response = createRateLimitError(rateLimitResult.resetTime);
    const headers = getRateLimitHeaders(clientId, 'auth');
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  try {
    const body = await request.json() as { identifier?: string; password?: string };
    const { identifier, password } = body;

    if (!identifier || !password) {
      return createSecurityError('Identifier and password are required', 400);
    }

    const user = await findUserForLogin(db, identifier);

    if (!user) {
      // Record failed attempt for the identifier
      recordFailedAttempt(identifier);
      return createSecurityError('Invalid credentials', 401);
    }

    // Check if user is locked out due to too many failed attempts
    if (isUserLockedOut(identifier)) {
      return createSecurityError('Account temporarily locked due to too many failed attempts. Please try again later.', 429);
    }

    // Verify password
    // Handle password_hash that might be returned as array of numbers (hex-encoded)
    let passwordHash = user.password_hash as string;
    if (Array.isArray(user.password_hash)) {
      // Convert array of numbers back to string
      passwordHash = String.fromCharCode(...user.password_hash);
    } else if (typeof user.password_hash === 'object' && user.password_hash !== null) {
      // Handle if password_hash is an object (sometimes D1 returns objects)
      // Try to extract the actual hash string
      const hashStr = JSON.stringify(user.password_hash);
      passwordHash = hashStr;
    }
    // Try comparing with raw password first
    let isValidPassword = await bcrypt.compare(password, passwordHash);

    // If raw doesn't match, try normalized (digits only) for phone-based temp passwords
    if (!isValidPassword) {
      const normalizedPassword = password.replace(/\D/g, '');
      if (normalizedPassword && normalizedPassword !== password) {
        isValidPassword = await bcrypt.compare(normalizedPassword, passwordHash);
      }
    }

    if (!isValidPassword) {
      // Record failed attempt
      recordFailedAttempt(identifier);
      return createSecurityError('Invalid credentials', 401);
    }

    // Email verification check removed - email verification flow not implemented
    // TODO: Implement email verification flow if needed

    // Generate JWT tokens
    const accessToken = generateAccessToken(Number(user.id), user.email, user.role);
    const refreshTokenId = crypto.randomUUID();
    const refreshToken = generateRefreshToken(Number(user.id), refreshTokenId);

    // Clear failed attempts on successful login
    clearFailedAttempts(identifier);

    // Log successful login for audit
    try {
      await logAuditEvent(db, {
        user_id: user.id,
        action: 'login_success',
        resource: 'auth',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent')?.slice(0, 200) || 'unknown',
        details: `Login via identifier: ${identifier}`,
        success: true
      });
    } catch {
    }

    // Check if password change is required
    const passwordChangeRequired = user.password_needs_reset === 1;

    let redirectTo: string | undefined;

    if (user.role === 'cleaner') {
      const cleanerProgress = await db.prepare(
        `SELECT tp.background_check_consent, tp.contract_signed, tp.completed
         FROM cleaner_profiles cp
         LEFT JOIN training_progress tp ON cp.paysheet_code = tp.employee_id
         WHERE cp.user_id = ?`
      ).bind(user.id).first() as {
        background_check_consent?: number | null;
        contract_signed?: number | null;
        completed?: number | null;
      } | null;

      redirectTo = '/cleaner-pre-dashboard';

      if (
        cleanerProgress &&
        cleanerProgress.background_check_consent === 1 &&
        cleanerProgress.contract_signed === 1 &&
        cleanerProgress.completed === 1
      ) {
        redirectTo = '/cleaner-dashboard';
      }

      try {
        await db.prepare(
          `INSERT INTO login_activity (user_id, stage, timestamp, success, ip_address, user_agent)
           VALUES (?, ?, datetime('now'), 1, ?, ?)`
        ).bind(
          user.id,
          redirectTo === '/cleaner-dashboard' ? 'cleaner_dashboard' : 'pre_dashboard',
          request.headers.get('x-forwarded-for') || 'unknown',
          request.headers.get('user-agent')?.slice(0, 200) || 'unknown'
        ).run();
      } catch {
      }
    }

    const response = NextResponse.json({
      success: true,
      token: accessToken,
      role: user.role,
      username: user.email,
      user_id: user.id,
      paysheet_code: user.paysheet_code || user.phone || identifier,
      redirect_to: redirectTo,
      mustChangePassword: passwordChangeRequired
    });

    // Set httpOnly cookies for session management
    setAuthCookies(response, accessToken, refreshToken);

    // Apply security headers
    applySecurityMiddleware(response);

    // Add rate limit headers
    const responseHeaders = getRateLimitHeaders(clientId, 'auth');
    Object.entries(responseHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    return createSecurityError('Login failed', 500);
  }
}
