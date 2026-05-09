import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createEmailVerificationToken, logAuditEvent } from '@/lib/db';
import { withRateLimit, withSecurityHeaders, withTracing, logRequest, getClientIP } from '@/lib/middleware';
import { sanitizeEmail } from '@/lib/sanitization';

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
    const body = await request.json() as { email?: string };
    const { email } = body;

    if (!email) {
      const response = NextResponse.json({ error: 'Email is required' }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const sanitizedEmail = sanitizeEmail(email);
    const user = await getUserByEmail(db, sanitizedEmail);

    if (!user) {
      // Don't reveal if email exists or not for security
      const response = NextResponse.json({ 
        message: 'If an account exists with this email, a verification link has been sent.'
      });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Create verification token
    const token = await createEmailVerificationToken(db, (user as any).id, sanitizedEmail);

    // Log the email verification request
    await logAuditEvent(db, {
      user_id: (user as any).id,
      action: 'EMAIL_VERIFICATION_SENT',
      resource: 'user',
      resource_id: (user as any).id.toString(),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ email: sanitizedEmail }),
      success: true,
      trace_id: traceId
    });

    // TODO: Send actual email using Resend or similar service
    // For now, return token in development mode
    const verificationLink = `${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
    
    if (process.env.NODE_ENV === 'development') {
      const response = NextResponse.json({ 
        message: 'Verification link sent (development mode)',
        verificationLink,
        token // Only in development
      });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Production: Send email (TODO: Implement email service)
    // await sendVerificationEmail(sanitizedEmail, verificationLink);

    const response = NextResponse.json({ 
      message: 'If an account exists with this email, a verification link has been sent.'
    });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    await logAuditEvent(db, {
      action: 'EMAIL_VERIFICATION_FAILED',
      resource: 'auth',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ error: (error as Error).message }),
      success: false,
      error_message: (error as Error).message,
      trace_id: traceId
    });

    const response = NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }
}
