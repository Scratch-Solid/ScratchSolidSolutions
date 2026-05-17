import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      booking_id?: number;
      photo_url?: string;
      photo_type?: 'before' | 'during' | 'after' | 'issue';
      description?: string;
    };
    const { booking_id, photo_url, photo_type, description } = body;
    const cleanerId = (user as any).id;

    if (!booking_id || !photo_url || !photo_type) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Verify cleaner is assigned to this booking
    const booking = await db.prepare(
      'SELECT cleaner_id FROM bookings WHERE id = ?'
    ).bind(booking_id).first();

    if (!booking || (booking as any).cleaner_id !== cleanerId) {
      const response = NextResponse.json({ error: 'Unauthorized or booking not found' }, { status: 403 });
      return withSecurityHeaders(response, traceId);
    }

    // Store photo
    const result = await db.prepare(
      `INSERT INTO cleaning_photos (booking_id, cleaner_id, photo_url, photo_type, description, uploaded_at)
       VALUES (?, ?, ?, ?, ?, datetime('now')) RETURNING *`
    ).bind(booking_id, cleanerId, photo_url, photo_type, description || '').first();

    logger.info(`Photo uploaded for booking ${booking_id}`, { booking_id, photo_type, cleanerId });

    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error uploading photo', error as Error);
    const response = NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const cleanerId = searchParams.get('cleaner_id');
    const photoType = searchParams.get('photo_type');

    let query = 'SELECT * FROM cleaning_photos WHERE 1=1';
    const params: any[] = [];

    if (bookingId) {
      query += ' AND booking_id = ?';
      params.push(bookingId);
    }
    if (cleanerId) {
      query += ' AND cleaner_id = ?';
      params.push(cleanerId);
    }
    if (photoType) {
      query += ' AND photo_type = ?';
      params.push(photoType);
    }

    query += ' ORDER BY uploaded_at DESC';

    const photos = await db.prepare(query).bind(...params).all();

    const response = NextResponse.json(photos.results || []);
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching photos', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
