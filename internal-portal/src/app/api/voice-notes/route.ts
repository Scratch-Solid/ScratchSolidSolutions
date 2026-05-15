import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'client', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      booking_id?: number;
      audio_url?: string;
      duration_seconds?: number;
      transcribed_text?: string;
    };
    const { booking_id, audio_url, duration_seconds, transcribed_text } = body;
    const senderId = (user as any).id;

    if (!booking_id || !audio_url) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `INSERT INTO voice_notes (booking_id, sender_id, audio_url, duration_seconds, transcribed_text, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now')) RETURNING *`
    ).bind(booking_id, senderId, audio_url, duration_seconds || null, transcribed_text || null).first();

    logger.info(`Voice note added for booking ${booking_id}`);

    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error adding voice note', error as Error);
    const response = NextResponse.json({ error: 'Failed to add voice note' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'client', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const senderId = searchParams.get('sender_id');

    let query = 'SELECT * FROM voice_notes WHERE 1=1';
    const params: any[] = [];

    if (bookingId) {
      query += ' AND booking_id = ?';
      params.push(bookingId);
    }
    if (senderId) {
      query += ' AND sender_id = ?';
      params.push(senderId);
    }

    query += ' ORDER BY created_at DESC';

    const notes = await db.prepare(query).bind(...params).all();

    const response = NextResponse.json(notes.results || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching voice notes', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch voice notes' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
