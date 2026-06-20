export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withSecurityHeaders, withTracing } from '@/lib/middleware';

/**
 * Client-side error sink for the React ErrorBoundary.
 * Accepts a best-effort error report and records it via the platform logger
 * (Cloudflare Workers observability). Intentionally unauthenticated and
 * tolerant: it must never throw, so the error reporter itself can't error.
 */
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  try {
    const body = (await request.json().catch(() => ({}))) as {
      error?: string;
      stack?: string;
      componentStack?: string;
      url?: string;
      userAgent?: string;
    };

    console.error('[client-error]', JSON.stringify({
      traceId,
      error: body.error || 'unknown',
      url: body.url || '',
      stack: body.stack || '',
      componentStack: body.componentStack || '',
      userAgent: body.userAgent || '',
    }));

    return withSecurityHeaders(NextResponse.json({ success: true }), traceId);
  } catch {
    // Never fail the error reporter.
    return withSecurityHeaders(NextResponse.json({ success: true }), traceId);
  }
}
