export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, revokeAllUserSessions, logAuditEvent } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { withAuth, withTracing, withSecurityHeaders, withRateLimit } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);
  const { user, db } = auth as any;

  const rl = await withRateLimit(request);
  if (rl) return withSecurityHeaders(rl, traceId);

  try {
    await db.prepare('ALTER TABLE users ADD COLUMN password_needs_reset INTEGER DEFAULT 0').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0').run().catch(() => {});

    const body = await request.json() as { currentPassword?: string; newPassword?: string };
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return withSecurityHeaders(NextResponse.json({ error: 'Current and new password required' }, { status: 400 }), traceId);
    }

    const existing = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();
    if (!existing) {
      return withSecurityHeaders(NextResponse.json({ error: 'User not found' }, { status: 404 }), traceId);
    }

    const matches = await bcrypt.compare(currentPassword, (existing as any).password_hash);
    if (!matches) {
      return withSecurityHeaders(NextResponse.json({ error: 'Invalid current password' }, { status: 401 }), traceId);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ?, password_needs_reset = 0, login_count = 0 WHERE id = ?').bind(newHash, user.id).run();

    const currentToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    await revokeAllUserSessions(db, user.id, currentToken);

    await logAuditEvent(db, {
      user_id: user.id,
      action: 'password_changed',
      resource: 'user',
      resource_id: String(user.id),
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      success: true
    });

    return withSecurityHeaders(NextResponse.json({ success: true }), traceId);
  } catch (err) {
    console.error('change-password error', err);
    return withSecurityHeaders(NextResponse.json({ error: 'Failed to change password' }, { status: 500 }), traceId);
  }
}
