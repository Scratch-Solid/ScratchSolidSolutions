import { NextRequest, NextResponse } from 'next/server';
import { getDb, rejectAdminUser, validateSession, logAuditEvent } from '@/lib/db';
import { withRateLimit, withSecurityHeaders, withTracing, logRequest, getClientIP } from '@/lib/middleware';
import { sanitizeRequestBody } from '@/lib/sanitization';

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
    // Validate admin session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response = NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const token = authHeader.substring(7);
    const session = await validateSession(db, token);

    if (!session || (session as any).role !== 'admin' && (session as any).role !== 'super_admin') {
      const response = NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Sanitize and validate request body
    const body = await request.json();
    const { sanitized, error } = sanitizeRequestBody(body, {
      required: ['userId'],
      optional: ['notes']
    });

    if (error) {
      const response = NextResponse.json({ error }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const { userId, notes } = sanitized as { userId: number; notes?: string };

    // Reject the admin user
    await rejectAdminUser(db, userId, (session as any).id, notes);

    // Log the rejection
    await logAuditEvent(db, {
      user_id: (session as any).id,
      action: 'ADMIN_REJECTED',
      resource: 'user',
      resource_id: userId.toString(),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ rejectedUserId: userId, notes }),
      success: true,
      trace_id: traceId
    });

    const response = NextResponse.json({ 
      message: 'Admin user rejected successfully',
      userId
    });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    await logAuditEvent(db, {
      action: 'ADMIN_REJECTION_FAILED',
      resource: 'admin_approval',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ error: (error as Error).message }),
      success: false,
      error_message: (error as Error).message,
      trace_id: traceId
    });

    const response = NextResponse.json({ error: 'Failed to reject admin user' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }
}
