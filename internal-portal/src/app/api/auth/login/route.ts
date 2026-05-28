export const dynamic = "force-dynamic";
/**
 * Enhanced Login Endpoint with Security Features
 * Phase 3.2: Enhanced API Security Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { 
  applySecurityMiddleware, 
  checkRateLimit, 
  getRateLimitHeaders, 
  createSecurityError,
  createRateLimitError
} from '@/lib/security-middleware';
import { withCsrf } from '@/lib/middleware';
import { generateAccessToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // CRITICAL: Get DB BEFORE ANY other operation to ensure AsyncLocalStorage context is preserved
  const db = await getDb();
  if (!db) {
    return createSecurityError('Database unavailable', 503);
  }

  // CSRF protection - disabled for login endpoint to allow initial authentication
  // const csrfResult = await withCsrf(request);
  // if (csrfResult) return csrfResult;

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
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return createSecurityError('Identifier and password are required', 400);
    }

    // Query user by email, phone, or paysheet code
    let user = await db.prepare(
      'SELECT id, email, password_hash, role, name, phone, address, business_name, email_verified FROM users WHERE email = ? OR phone = ?'
    ).bind(identifier, identifier).first() as { id: number; email: string; password_hash: string; role: string; name: string; phone: string; address: string; business_name: string; email_verified: boolean } | null;

    // If not found in users table, try paysheet code in cleaner_profiles
    if (!user) {
      const cleanerProfile = await db.prepare(
        'SELECT user_id FROM cleaner_profiles WHERE paysheet_code = ?'
      ).bind(identifier).first() as { user_id: number } | null;

      if (cleanerProfile) {
        user = await db.prepare(
          'SELECT id, email, password_hash, role, name, phone, address, business_name, email_verified FROM users WHERE id = ?'
        ).bind(cleanerProfile.user_id).first() as { id: number; email: string; password_hash: string; role: string; name: string; phone: string; address: string; business_name: string; email_verified: boolean } | null;
      }
    }

    if (!user) {
      return createSecurityError('Invalid credentials', 401);
    }

    // Verify password
    // Handle password_hash that might be returned as array of numbers (hex-encoded)
    let passwordHash = user.password_hash as string;
    if (Array.isArray(user.password_hash)) {
      // Convert array of numbers back to string
      passwordHash = String.fromCharCode(...user.password_hash);
    }
    const isValidPassword = await bcrypt.compare(password, passwordHash);
    if (!isValidPassword) {
      return createSecurityError('Invalid credentials', 401);
    }

    // Check if email is verified (skip for cleaners who login via paysheet code)
    if (!user.email_verified && user.role !== 'cleaner') {
      return createSecurityError('Please verify your email before logging in', 403);
    }

    // Generate JWT token
    const token = generateAccessToken(Number(user.id), user.email, user.role);

    // Check if password change is required (password older than 90 days)
    const passwordChangeRequired = false; // TODO: Implement password age check

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
