export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { validatePasswordStrength, hashPassword } from '@/lib/auth';
import { generateAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/session';
import crypto from 'crypto';

// Public: token-holder isn't authenticated yet. Mirrors auth/reset-password's
// token validation shape (password_reset_tokens -> admin_invite_tokens).
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) return withSecurityHeaders(NextResponse.json({ error: 'Database unavailable' }, { status: 503 }), traceId);

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return withSecurityHeaders(NextResponse.json({ error: 'Token is required' }, { status: 400 }), traceId);
    }

    const invite = await db.prepare(
      `SELECT t.expires_at, t.used_at, t.revoked_at, u.email, u.name
       FROM admin_invite_tokens t JOIN users u ON t.user_id = u.id
       WHERE t.token = ?`
    ).bind(token).first() as { expires_at: string; used_at: string | null; revoked_at: string | null; email: string; name: string } | null;

    if (!invite) {
      return withSecurityHeaders(NextResponse.json({ valid: false, error: 'Invalid invite link' }), traceId);
    }
    if (invite.used_at) {
      return withSecurityHeaders(NextResponse.json({ valid: false, error: 'This invite has already been used' }), traceId);
    }
    if (invite.revoked_at) {
      return withSecurityHeaders(NextResponse.json({ valid: false, error: 'This invite has been revoked' }), traceId);
    }
    if (new Date() > new Date(invite.expires_at)) {
      return withSecurityHeaders(NextResponse.json({ valid: false, error: 'This invite has expired' }), traceId);
    }

    return withSecurityHeaders(NextResponse.json({ valid: true, email: invite.email, name: invite.name }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to validate invite: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) return withSecurityHeaders(NextResponse.json({ error: 'Database unavailable' }, { status: 503 }), traceId);

  try {
    const body = await request.json() as { token?: string; password?: string };
    const { token, password } = body;

    if (!token || !password) {
      return withSecurityHeaders(NextResponse.json({ error: 'Token and password are required' }, { status: 400 }), traceId);
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: passwordValidation.errors.join(', ') }, { status: 400 }), traceId);
    }

    const invite = await db.prepare(
      `SELECT t.id, t.user_id, t.expires_at, t.used_at, t.revoked_at, u.email, u.name, u.role
       FROM admin_invite_tokens t JOIN users u ON t.user_id = u.id
       WHERE t.token = ?`
    ).bind(token).first() as { id: number; user_id: number; expires_at: string; used_at: string | null; revoked_at: string | null; email: string; name: string; role: string } | null;

    if (!invite) {
      return withSecurityHeaders(NextResponse.json({ error: 'Invalid invite link' }, { status: 404 }), traceId);
    }
    if (invite.used_at) {
      return withSecurityHeaders(NextResponse.json({ error: 'This invite has already been used' }, { status: 400 }), traceId);
    }
    if (invite.revoked_at) {
      return withSecurityHeaders(NextResponse.json({ error: 'This invite has been revoked' }, { status: 400 }), traceId);
    }
    if (new Date() > new Date(invite.expires_at)) {
      return withSecurityHeaders(NextResponse.json({ error: 'This invite has expired' }, { status: 400 }), traceId);
    }

    // Consume the token atomically, re-checking used_at/revoked_at/expiry in
    // the same statement - the SELECT above is only for error messaging.
    // Without this, two concurrent POSTs with the same still-valid token
    // could both pass the SELECT's used_at check before either UPDATE
    // landed, letting the single-use token be redeemed twice.
    const consumed = await db.prepare(
      `UPDATE admin_invite_tokens SET used_at = datetime('now')
       WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > datetime('now')`
    ).bind(invite.id).run();

    if (consumed.meta.changes === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'This invite has already been used, revoked, or expired' }, { status: 400 }), traceId);
    }

    const passwordHash = await hashPassword(password);

    await db.prepare(
      `UPDATE users SET password_hash = ?, email_verified = 1, admin_approval_status = 'approved', updated_at = datetime('now') WHERE id = ?`
    ).bind(passwordHash, invite.user_id).run();

    const accessToken = await generateAccessToken(invite.user_id, invite.email, invite.role);
    const refreshToken = await generateRefreshToken(invite.user_id, crypto.randomUUID());

    const response = NextResponse.json({
      success: true,
      token: accessToken,
      user: { id: invite.user_id, email: invite.email, name: invite.name, role: invite.role },
    });
    setAuthCookies(response, accessToken, refreshToken);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to accept invite: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
