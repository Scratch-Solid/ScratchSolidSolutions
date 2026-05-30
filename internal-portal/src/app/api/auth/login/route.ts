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
import { withCsrf } from '@/lib/middleware';
import { generateAccessToken, recordFailedAttempt, isUserLockedOut, clearFailedAttempts } from '@/lib/auth';

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

    // Query user by email, phone, username, or paysheet code
    let user = await db.prepare(
      'SELECT id, email, password_hash, role, name, phone, address, business_name, password_needs_reset FROM users WHERE email = ? OR phone = ? OR username = ?'
    ).bind(identifier, identifier, identifier).first() as { id: number; email: string; password_hash: string; role: string; name: string; phone: string; address: string; business_name: string; password_needs_reset: number } | null;

    // If not found in users table, try paysheet code in cleaner_profiles
    if (!user) {
      const cleanerProfile = await db.prepare(
        'SELECT user_id FROM cleaner_profiles WHERE paysheet_code = ?'
      ).bind(identifier).first() as { user_id: number } | null;

      if (cleanerProfile) {
        user = await db.prepare(
          'SELECT id, email, password_hash, role, name, phone, address, business_name, password_needs_reset FROM users WHERE id = ?'
        ).bind(cleanerProfile.user_id).first() as { id: number; email: string; password_hash: string; role: string; name: string; phone: string; address: string; business_name: string; password_needs_reset: number } | null;
      }
    }

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
      console.log('password_hash is object:', JSON.stringify(user.password_hash));
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

    // Generate JWT token
    const token = generateAccessToken(Number(user.id), user.email, user.role);

    // Clear failed attempts on successful login
    clearFailedAttempts(identifier);

    // Log successful login for audit
    await logAuditEvent(db, {
      user_id: user.id,
      action: 'login_success',
      resource: 'auth',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent')?.slice(0, 200) || 'unknown',
      details: `Login via identifier: ${identifier}`,
      success: true
    });

    // Check if password change is required
    const passwordChangeRequired = user.password_needs_reset === 1;

    const response = NextResponse.json({
      success: true,
      token,
      role: user.role,
      username: user.email,
      user_id: user.id,
      paysheet_code: user.phone, // Use phone as paysheet code
      mustChangePassword: passwordChangeRequired
    });

    // Apply security headers
    applySecurityMiddleware(response);

    // Add rate limit headers
    const responseHeaders = getRateLimitHeaders(clientId, 'auth');
    Object.entries(responseHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return createSecurityError('Login failed', 500);
  }
}
