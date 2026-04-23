import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status) {
      await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(body.status, id).run();
    }
    if (body.cleaner_id !== undefined) {
      await db.prepare('UPDATE bookings SET cleaner_id = ? WHERE id = ?').bind(body.cleaner_id, id).run();
    }

    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    const response = NextResponse.json(updated || { success: true });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error updating booking:', error);
    const response = NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
