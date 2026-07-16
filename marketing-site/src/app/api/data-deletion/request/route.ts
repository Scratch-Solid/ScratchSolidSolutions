export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail } from '@/lib/db';
import { sanitizeEmail } from '@/lib/sanitization';
import { withRateLimit, rateLimits } from '@/lib/middleware';
import { sendDataDeletionConfirmationEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

// Generic response used whether or not the email matches an account, so this
// endpoint can't be used to enumerate registered emails.
const GENERIC_MESSAGE = 'If an account exists with that email address, a confirmation link has been sent. Please check your inbox to confirm your data deletion request.';

export async function POST(request: NextRequest) {
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({})) as { email?: string; reason?: string };
    const email = sanitizeEmail(body.email || '');
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 1000) : null;

    if (!email) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Service temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    const user = await getUserByEmail(db, email);
    if (!user) {
      // Same response as the success path - don't reveal whether this email is registered.
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(
      `INSERT INTO data_deletion_requests (user_id, email, reason, status, confirmation_token, confirmation_expires_at, requested_at)
       VALUES (?, ?, ?, 'unconfirmed', ?, ?, datetime('now'))`
    ).bind((user as any).id, email, reason, token, expiresAt).run();

    const confirmLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/data-deletion/confirm?token=${token}`;
    const emailResult = await sendDataDeletionConfirmationEmail(email, confirmLink);
    if (!emailResult.success) {
      logger.error('Failed to send data deletion confirmation email', new Error(JSON.stringify(emailResult)));
    }

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    logger.error('Error creating data deletion request', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
