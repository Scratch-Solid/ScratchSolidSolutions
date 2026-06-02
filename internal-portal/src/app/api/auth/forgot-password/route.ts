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

    // Store reset token in database (requires password_reset_tokens table)
    // For now, we'll return the token in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';

    const response = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      ...(isDevelopment && { resetToken }) // Only return token in development
    });

    applySecurityMiddleware(response);
    return response;

  } catch (error) {
    console.error('Forgot password error:', error);
    return createSecurityError('Failed to process request', 500);
  }
}
