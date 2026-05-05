import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimits } from "@/lib/middleware";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many account deletion requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      password?: string;
      confirm?: boolean;
    };
    const { password, confirm } = body;

    if (!confirm) {
      return NextResponse.json({ error: 'You must confirm account deletion' }, { status: 400 });
    }

    // Verify password before allowing deletion
    if (password) {
      const userRecord = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind((user as any).id).first();
      if (!userRecord) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isValid = await bcrypt.compare(password, (userRecord as any).password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
    }

    // Soft delete: mark as deleted with grace period timestamp
    const gracePeriodDays = 30;
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

    await db.prepare(`
      UPDATE users 
      SET deleted = 1, 
          soft_delete_at = datetime('now'),
          email = email || '-deleted-' || id,
          phone = phone || '-deleted-' || id
      WHERE id = ?
    `).bind((user as any).id).run();

    // Log audit
    await db.prepare(`
      INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details)
      VALUES (?, 'soft_delete_account', 'user', ?, ?)
    `).bind((user as any).id, (user as any).id, JSON.stringify({ grace_period_end: gracePeriodEnd.toISOString() })).run();

    // Clear user's session
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind((user as any).id).run();

    const response = NextResponse.json({ 
      message: 'Account marked for deletion. You can restore your account within 30 days.',
      grace_period_end: gracePeriodEnd.toISOString()
    }, { status: 200 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error deleting account', error as Error);
    const response = NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      action?: 'restore';
      password?: string;
    };
    const { action, password } = body;

    if (action !== 'restore') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Check if account is within grace period
    const userRecord = await db.prepare('SELECT soft_delete_at FROM users WHERE id = ?').bind((user as any).id).first();
    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!(userRecord as any).soft_delete_at) {
      return NextResponse.json({ error: 'Account is not marked for deletion' }, { status: 400 });
    }

    // Check if within 30-day grace period
    const deleteDate = new Date((userRecord as any).soft_delete_at);
    const now = new Date();
    const daysSinceDeletion = Math.floor((now.getTime() - deleteDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceDeletion > 30) {
      return NextResponse.json({ error: 'Grace period has expired. Account cannot be restored.' }, { status: 400 });
    }

    // Restore account
    await db.prepare(`
      UPDATE users 
      SET deleted = 0, 
          soft_delete_at = NULL,
          email = REPLACE(email, '-deleted-' || id, ''),
          phone = REPLACE(phone, '-deleted-' || id, ''),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind((user as any).id).run();

    // Log audit
    await db.prepare(`
      INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details)
      VALUES (?, 'restore_account', 'user', ?, ?)
    `).bind((user as any).id, (user as any).id, JSON.stringify({ days_since_deletion: daysSinceDeletion })).run();

    const response = NextResponse.json({ message: 'Account restored successfully' }, { status: 200 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error restoring account', error as Error);
    const response = NextResponse.json({ error: 'Failed to restore account' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
