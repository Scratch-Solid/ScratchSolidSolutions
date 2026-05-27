export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  checkRateLimit,
  isUserLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  logAuthEvent,
  getUserPermissions,
  isSuperuser,
} from '@/lib/auth';

/**
 * World-Class Login Endpoint
 * 
 * Features:
 * - Rate limiting (IP-based)
 * - Brute force protection with exponential backoff
 * - Secure session management with refresh tokens
 * - RBAC integration (permissions returned in response)
 * - Comprehensive audit logging
 * - Secure token generation with JWT
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    // Get client IP for rate limiting
    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    // Find user by email
    const userResult = await db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();

    if (!userResult) {
      // Record failed attempt for IP
      recordFailedAttempt(ip);
      await logAuthEvent(db, null, 'login_failed', ip, userAgent, { email });
      
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Check if user is locked out
    if (userResult.locked_until && userResult.locked_until > Math.floor(Date.now() / 1000)) {
      return NextResponse.json({
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
      }, { status: 423 });
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, userResult.password_hash);
    if (!passwordMatch) {
      // Increment failed login attempts
      const newAttempts = (userResult.failed_login_attempts || 0) + 1;
      let lockedUntil = null;
      
      if (newAttempts >= 5) {
        lockedUntil = Math.floor(Date.now() / 1000) + (15 * 60); // Lock for 15 minutes
      }

      await db.prepare(
        'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?'
      ).bind(newAttempts, lockedUntil, userResult.id).run();

      recordFailedAttempt(ip);
      await logAuthEvent(db, userResult.id, 'login_failed', ip, userAgent, { email });
      
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Clear failed attempts on successful login
    await db.prepare(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ?, last_login_ip = ? WHERE id = ?'
    ).bind(Math.floor(Date.now() / 1000), ip, userResult.id).run();

    clearFailedAttempts(ip);

    // Generate tokens
    const accessToken = generateAccessToken(userResult.id, userResult.email, userResult.role);
    const refreshToken = generateRefreshToken(userResult.id);
    const refreshTokenHash = await hashPassword(refreshToken);
    const tokenId = refreshToken.split('.')[1]; // Extract token ID from JWT

    // Store refresh token in database
    await db.prepare(
      `INSERT INTO refresh_tokens (user_id, token_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      userResult.id,
      tokenId,
      refreshTokenHash,
      Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      ip,
      userAgent
    ).run();

    // Get user permissions
    const permissions = await getUserPermissions(db, userResult.id);
    const superuser = await isSuperuser(db, userResult.id);

    // Log successful login
    await logAuthEvent(db, userResult.id, 'login_success', ip, userAgent, { email });

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: userResult.id,
        email: userResult.email,
        name: userResult.name,
        role: userResult.role,
        is_superuser: superuser,
        permissions,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Use POST to login'
  }, { status: 405 });
}
