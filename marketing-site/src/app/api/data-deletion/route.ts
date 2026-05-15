import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const userId = (user as any).id;
    const userEmail = (user as any).email;

    // Create data deletion request
    const result = await db.prepare(
      `INSERT INTO data_deletion_requests (user_id, email, status, requested_at, processed_at)
       VALUES (?, ?, 'pending', datetime('now'), NULL) RETURNING *`
    ).bind(userId, userEmail).first();

    // Log the request
    logger.info(`Data deletion request created for user ${userId}`, { userId, userEmail });

    if (!result) {
      const response = NextResponse.json({ error: 'Failed to create deletion request' }, { status: 500 });
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Data deletion request submitted. You will receive confirmation via email within 30 days.',
      request_id: result.id
    }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating data deletion request', error as Error);
    const response = NextResponse.json({ error: 'Failed to submit deletion request' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const userId = (user as any).id;

    // Check if user has a pending deletion request
    const request = await db.prepare(
      'SELECT * FROM data_deletion_requests WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1'
    ).bind(userId).first();

    const response = NextResponse.json(request || { message: 'No deletion request found' });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching deletion request', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch deletion request' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
