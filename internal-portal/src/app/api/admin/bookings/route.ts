export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'transport']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cleaner_id = searchParams.get('cleaner_id');
    const client_id = searchParams.get('client_id');
    const type = searchParams.get('type');

    let query = 'SELECT * FROM bookings';
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (cleaner_id) {
      conditions.push('cleaner_id = ?');
      params.push(cleaner_id);
    }

    if (client_id) {
      conditions.push('client_id = ?');
      params.push(client_id);
    }

    if (type) {
      conditions.push('(booking_type = ? OR service_type = ?)');
      params.push(type, type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY booking_date DESC, booking_time DESC';

    const bookings = await db.prepare(query).bind(...params).all();
    const response = NextResponse.json(bookings.results || []);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch bookings: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
