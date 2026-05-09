import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAuditLogs, validateSession, logAuditEvent } from '@/lib/db';
import { withRateLimit, withSecurityHeaders, withTracing, logRequest, getClientIP } from '@/lib/middleware';

export async function GET(request: NextRequest) {
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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const filters = {
      user_id: searchParams.get('user_id') ? parseInt(searchParams.get('user_id')!) : undefined,
      action: searchParams.get('action') || undefined,
      resource: searchParams.get('resource') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Get audit logs
    const auditLogs = await getAuditLogs(db, filters);

    // Log the access
    await logAuditEvent(db, {
      user_id: (session as any).id,
      action: 'AUDIT_LOGS_VIEWED',
      resource: 'audit_logs',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ filters, count: auditLogs.length }),
      success: true,
      trace_id: traceId
    });

    const response = NextResponse.json({ 
      auditLogs,
      count: auditLogs.length,
      filters
    });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    await logAuditEvent(db, {
      action: 'AUDIT_LOGS_FAILED',
      resource: 'audit_logs',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ error: (error as Error).message }),
      success: false,
      error_message: (error as Error).message,
      trace_id: traceId
    });

    const response = NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }
}
