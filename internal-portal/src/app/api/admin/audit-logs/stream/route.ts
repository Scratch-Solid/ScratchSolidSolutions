export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, validateSession } from '@/lib/db';
import { withRateLimit, withSecurityHeaders, withTracing, getClientIP } from '@/lib/middleware';
import { getAuditLogs, AuditLogFilter } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return withSecurityHeaders(rateLimitResponse, traceId);
  }

  const db = await getDb();
  if (!db) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Database not available' }, { status: 500 }),
      traceId
    );
  }

  try {
    // Validate admin session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
        traceId
      );
    }

    const token = authHeader.substring(7);
    const session = await validateSession(db, token);

    if (!session || (session as any).role !== 'admin' && (session as any).role !== 'super_admin') {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
        traceId
      );
    }

    // Create Server-Sent Events stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Send initial data
          const initialFilters: AuditLogFilter = { limit: 50 };
          const initialLogs = await getAuditLogs(initialFilters);
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'initial', logs: initialLogs })}\n\n`));

          // Poll for new logs every 5 seconds
          const interval = setInterval(async () => {
            try {
              const filters: AuditLogFilter = { limit: 50 };
              const logs = await getAuditLogs(filters);
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'update', logs })}\n\n`));
            } catch (error) {
              console.error('Error polling audit logs:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Failed to fetch logs' })}\n\n`));
            }
          }, 5000);

          // Cleanup on client disconnect
          request.signal.addEventListener('abort', () => {
            clearInterval(interval);
            controller.close();
          });
        } catch (error) {
          console.error('Error in audit log stream:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Stream error' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Audit log stream error:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: 'Failed to create audit log stream' }, { status: 500 }),
      traceId
    );
  }
}
