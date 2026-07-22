export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import {
  applySecurityMiddleware,
  checkRateLimit,
  getRateLimitHeaders,
  createSecurityError,
  createRateLimitError
} from '@/lib/security-middleware';
import { sendPasswordResetEmail } from '@/lib/email';

const PORTAL_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://portal.scratchsolidsolutions.org';

export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) {
    return createSecurityError('Database unavailable', 503);
  }

  // Get client identifier for rate limiting
  const clientId = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'anonymous';

  // Check rate limit
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
    const body = await request.json() as { email?: string };
    const { email } = body;

    if (!email) {
      return createSecurityError('Email is required', 400);
    }

    // Check if user exists
    const user = await db.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(email).first() as { id: number; email: string } | null;

    if (!user) {
      // Always return success to prevent email enumeration
      const response = NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
      applySecurityMiddleware(response);
      return response;
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    // Ensure password_reset_tokens table exists. Matches the table's actual
    // live production schema (which also backs an OTP-based reset method
    // this route doesn't use) - method is NOT NULL there, so every INSERT
    // must supply it explicitly.
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        token TEXT UNIQUE NOT NULL,
        otp TEXT DEFAULT NULL,
        method TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    // Store reset token in database
    await db.prepare(
      `INSERT INTO password_reset_tokens (user_id, token, method, expires_at) VALUES (?, ?, 'email', ?)`
    ).bind(user.id, resetToken, expiresAt).run();

    const resetLink = `${PORTAL_BASE_URL}/auth/reset-password?token=${resetToken}`;
    const emailResult = await sendPasswordResetEmail(user.email, resetLink);
    if (!emailResult.success) {
      console.error('Failed to send password reset email', { email: user.email, error: emailResult.error });
    }

    // In development, return the token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    const response = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      ...(isDevelopment && { resetToken })
    });

    applySecurityMiddleware(response);
    return response;

  } catch (error) {
    console.error('Forgot password error:', error);
    return createSecurityError('Failed to process request', 500);
  }
}
