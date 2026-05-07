import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, logRequest, withCsrf } from '@/lib/middleware';
import { sanitizeRequestBody } from '@/lib/sanitization';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const { id } = await params;
    const body = await request.json();
    const { sanitized, error } = sanitizeRequestBody(body, {
      optional: ['status', 'cleaner_id']
    });

    if (error) {
      const response = NextResponse.json({ error }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    if (sanitized.status) {
      await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(sanitized.status, id).run();
    }
    if (sanitized.cleaner_id !== undefined) {
      await db.prepare('UPDATE bookings SET cleaner_id = ? WHERE id = ?').bind(sanitized.cleaner_id, id).run();
    }

    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    const response = NextResponse.json(updated || { success: true });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
