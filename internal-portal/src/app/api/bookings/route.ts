export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleaner_id');
    const clientId = searchParams.get('client_id');
    const type = searchParams.get('type');

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const binds: string[] = [];
    if (cleanerId) { query += ' AND cleaner_id = ?'; binds.push(cleanerId); }
    if (clientId) { query += ' AND client_id = ?'; binds.push(clientId); }
    if (type) { query += ' AND booking_type = ?'; binds.push(type); }
    query += ' ORDER BY booking_date DESC LIMIT 100';

    const results = await db.prepare(query).bind(...binds).all();
    return NextResponse.json(results.results || []);
    response.headers.set('Cache-Control', 'private, max-age=15');
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request, ['admin', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { service_id, user_id, cleaner_id, booking_date, booking_time, notes } = await request.json();
    
    if (!service_id || !booking_date || !booking_time) {
      return NextResponse.json({ error: 'Missing required fields: service_id, booking_date, booking_time' }, { status: 400 });
    }
    
    const result = await db.prepare(
      'INSERT INTO bookings (service_id, user_id, cleaner_id, booking_date, booking_time, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, "pending", ?, datetime("now"), datetime("now")) RETURNING *'
    ).bind(service_id, user_id || null, cleaner_id || null, booking_date, booking_time, notes || null).first();
    
    return NextResponse.json(result, { status: 201 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
