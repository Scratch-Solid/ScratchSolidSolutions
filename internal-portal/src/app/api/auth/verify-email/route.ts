import { NextRequest, NextResponse } from 'next/server';
import { getDb, verifyEmailToken, logAuditEvent } from '@/lib/db';
import { withRateLimit, withSecurityHeaders, withTracing, logRequest, getClientIP } from '@/lib/middleware';

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
    const body = await request.json() as { token?: string };
    const { token } = body;

    if (!token) {
      const response = NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const user = await verifyEmailToken(db, token);

    if (!user) {
      await logAuditEvent(db, {
        action: 'EMAIL_VERIFICATION_FAILED',
        resource: 'auth',
        ip_address: getClientIP(request),
        user_agent: request.headers.get('user-agent') || '',
        details: JSON.stringify({ reason: 'Invalid or expired token', token: token.substring(0, 8) + '...' }),
        success: false,
        error_message: 'Invalid or expired verification token',
        trace_id: traceId
      });

      const response = NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Log successful email verification
    await logAuditEvent(db, {
      user_id: (user as any).id,
      action: 'EMAIL_VERIFIED',
      resource: 'user',
      resource_id: (user as any).id.toString(),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ email: (user as any).email }),
      success: true,
      trace_id: traceId
    });

    const response = NextResponse.json({ 
      message: 'Email verified successfully',
      email: (user as any).email
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

    const response = NextResponse.json({ error: 'Email verification failed' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }
}

// Also support GET requests for direct link verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/auth/login?error=missing_token`);
  }

  const traceId = withTracing(request);
  const startTime = Date.now();
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return withSecurityHeaders(rateLimitResponse, traceId);
  }

  const db = await getDb();
  if (!db) {
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/auth/login?error=database_error`);
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }

  try {
    const user = await verifyEmailToken(db, token);

    if (!user) {
      await logAuditEvent(db, {
        action: 'EMAIL_VERIFICATION_FAILED',
        resource: 'auth',
        ip_address: getClientIP(request),
        user_agent: request.headers.get('user-agent') || '',
        details: JSON.stringify({ reason: 'Invalid or expired token', token: token.substring(0, 8) + '...' }),
        success: false,
        error_message: 'Invalid or expired verification token',
        trace_id: traceId
      });

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/auth/login?error=invalid_token`);
    }

    // Log successful email verification
    await logAuditEvent(db, {
      user_id: (user as any).id,
      action: 'EMAIL_VERIFIED',
      resource: 'user',
      resource_id: (user as any).id.toString(),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ email: (user as any).email }),
      success: true,
      trace_id: traceId
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/auth/login?message=email_verified`);

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

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/auth/login?error=verification_failed`);
  }
}
