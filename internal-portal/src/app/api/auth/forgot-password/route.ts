import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, sanitizeEmail } from '@/lib/db';
import { withRateLimit, withSecurityHeaders, withTracing, logRequest } from '@/lib/middleware';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const startTime = Date.now();
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return withSecurityHeaders(rateLimitResponse, traceId);
  }

  const db = await getDb();
  if (!db) {
    const response = NextResponse.json({ error: 'Database not available' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      const response = NextResponse.json({ error: 'Email is required' }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Check if user exists
    const user = await getUserByEmail(db, sanitizedEmail);
    
    // Always return success to prevent email enumeration
    // Only send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in password_reset_tokens table
      await db.prepare(
        `INSERT INTO password_reset_tokens (user_id, token, method, expires_at) VALUES (?, ?, 'email', ?)`
      ).bind((user as any).id, resetToken, resetTokenExpiry.toISOString()).run();

      // In production, send email with reset link
      // For now, return the token in response (for testing only)
      console.log(`Password reset token for ${sanitizedEmail}: ${resetToken}`);
      
      const response = NextResponse.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.',
        // For testing only - remove in production
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json({ 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Password reset request error:', error);
    const response = NextResponse.json({ error: 'Password reset request failed' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }
}
