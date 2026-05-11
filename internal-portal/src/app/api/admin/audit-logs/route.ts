export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, validateSession } from '@/lib/db';
import { withRateLimit, withSecurityHeaders, withTracing, logRequest, getClientIP } from '@/lib/middleware';
import { getAuditLogs, exportAuditLogsToCSV, exportAuditLogsToPDF, AuditLogFilter, logAuditEvent } from '@/lib/audit-logger';
import { auth } from '@/lib/better-auth';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const startTime = Date.now();
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return withSecurityHeaders(rateLimitResponse, traceId);
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }

  try {
    // Validate admin session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const token = authHeader.substring(7);
    const session = await validateSession(db, token);

    if (!session || (session as any).role !== 'admin' && (session as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get('export');
    const filters: AuditLogFilter = {
      userId: searchParams.get('user_id') ? parseInt(searchParams.get('user_id')!) : undefined,
      action: searchParams.get('action') || undefined,
      resource: searchParams.get('resource') || undefined,
      severity: searchParams.get('severity') as any || undefined,
      startDate: searchParams.get('start_date') ? new Date(searchParams.get('start_date')!) : undefined,
      endDate: searchParams.get('end_date') ? new Date(searchParams.get('end_date')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Handle export requests
    if (exportFormat === 'csv') {
      const csvContent = await exportAuditLogsToCSV(filters);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`
        }
      });
    }

    if (exportFormat === 'pdf') {
      const pdfBuffer = await exportAuditLogsToPDF(filters);
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.pdf"`
        }
      });
    }

    // Get audit logs
    const auditLogs = await getAuditLogs(filters);

    // Log the access
    await logAuditEvent({
      userId: (session as any).id,
      action: 'AUDIT_LOGS_VIEWED',
      resource: 'audit_logs',
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      details: { filters, count: auditLogs.length },
      severity: 'info'
    });

    return NextResponse.json({ 
      auditLogs,
      count: auditLogs.length,
      filters
    });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    await logAuditEvent({
      userId: 0,
      action: 'AUDIT_LOGS_FAILED',
      resource: 'audit_logs',
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
      details: { error: (error as Error).message },
      severity: 'error'
    });

    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }
}
