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
import { withCsrf } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return csrfResult;

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

    // Ensure password_reset_tokens table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).run();

    // Store reset token in database
    await db.prepare(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`
    ).bind(user.id, resetToken, expiresAt).run();

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
