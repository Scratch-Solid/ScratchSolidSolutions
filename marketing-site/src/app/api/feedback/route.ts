import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      booking_id?: number;
      feedback_type?: 'rating' | 'issue' | 'comment' | 'completion';
      rating?: number;
      message?: string;
    };
    const { booking_id, feedback_type, rating, message } = body;
    const userId = (user as any).id;

    if (!booking_id || !feedback_type) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Verify user is the client for this booking
    const booking = await db.prepare(
      'SELECT client_id, cleaner_id FROM bookings WHERE id = ?'
    ).bind(booking_id).first();

    if (!booking || (booking as any).client_id !== userId) {
      const response = NextResponse.json({ error: 'Unauthorized or booking not found' }, { status: 403 });
      return withSecurityHeaders(response, traceId);
    }

    // Store feedback
    const result = await db.prepare(
      `INSERT INTO cleaning_feedback (booking_id, client_id, cleaner_id, feedback_type, rating, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now')) RETURNING *`
    ).bind(booking_id, userId, (booking as any).cleaner_id, feedback_type, rating || null, message || '').first();

    logger.info(`Feedback submitted for booking ${booking_id}`, { booking_id, feedback_type, userId });

    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error submitting feedback', error as Error);
    const response = NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
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
    const clientId = searchParams.get('client_id');
    const cleanerId = searchParams.get('cleaner_id');
    const feedbackType = searchParams.get('feedback_type');

    let query = 'SELECT * FROM cleaning_feedback WHERE 1=1';
    const params: any[] = [];

    if (bookingId) {
      query += ' AND booking_id = ?';
      params.push(bookingId);
    }
    if (clientId) {
      query += ' AND client_id = ?';
      params.push(clientId);
    }
    if (cleanerId) {
      query += ' AND cleaner_id = ?';
      params.push(cleanerId);
    }
    if (feedbackType) {
      query += ' AND feedback_type = ?';
      params.push(feedbackType);
    }

    query += ' ORDER BY created_at DESC';

    const feedback = await db.prepare(query).bind(...params).all();

    const response = NextResponse.json(feedback.results || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching feedback', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
