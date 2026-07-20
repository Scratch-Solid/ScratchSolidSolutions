export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRateLimit, rateLimits } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({})) as { token?: string };
    const token = body.token;

    if (!token) {
      return NextResponse.json({ error: 'A confirmation token is required' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Service temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    const pending = await db.prepare(
      `SELECT * FROM data_deletion_requests
       WHERE confirmation_token = ? AND status = 'unconfirmed' AND confirmation_expires_at > datetime('now')`
    ).bind(token).first();

    if (!pending) {
      return NextResponse.json({ error: 'This confirmation link is invalid or has expired. Please submit a new request.' }, { status: 400 });
    }

    await db.prepare(
      `UPDATE data_deletion_requests
       SET status = 'pending', confirmed_at = datetime('now'), confirmation_token = NULL, confirmation_expires_at = NULL
       WHERE id = ?`
    ).bind((pending as any).id).run();

    logger.info(`Data deletion request confirmed for user ${(pending as any).user_id}`, { userId: (pending as any).user_id });

    return NextResponse.json({
      message: 'Your data deletion request has been confirmed. Our team will process it within 30 days.'
    }, { status: 200 });
  } catch (error) {
    logger.error('Error confirming data deletion request', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
