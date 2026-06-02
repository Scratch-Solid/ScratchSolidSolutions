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
      'SELECT id, email, email_verified FROM users WHERE email = ?'
    ).bind(email).first() as { id: number; email: string; email_verified: number } | null;

    if (!user) {
      // Always return success to prevent email enumeration
      const response = NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.'
      });
      applySecurityMiddleware(response);
      return response;
    }

    if (user.email_verified === 1) {
      const response = NextResponse.json({
        success: true,
        message: 'Email is already verified.'
      });
      applySecurityMiddleware(response);
      return response;
    }

    // Generate verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 86400000).toISOString();

    // In a full implementation, this would:
    // 1. Store token in email_verification_tokens table
    // 2. Send email with verification link
    // 3. Link format: /auth/verify-email?token={token}

    const isDevelopment = process.env.NODE_ENV === 'development';

    const response = NextResponse.json({
      success: true,
      message: 'Verification email sent.',
      ...(isDevelopment && { verificationToken }) // Only return token in development
    });

    applySecurityMiddleware(response);
    return response;

  } catch (error) {
    console.error('Send verification error:', error);
    return createSecurityError('Failed to send verification email', 500);
  }
}
