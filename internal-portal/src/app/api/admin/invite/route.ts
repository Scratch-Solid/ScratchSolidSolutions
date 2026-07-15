export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuth, withTracing, withSecurityHeaders, withRateLimit, withCsrf, getClientIP } from '@/lib/middleware';
import { logAuditEvent } from '@/lib/db';
import { sendAdminInviteEmail } from '@/lib/email';

const INVITE_EXPIRY_DAYS = 7;
const PORTAL_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://portal.scratchsolidsolutions.org';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const result = await db.prepare(
      `SELECT t.id, t.user_id, t.expires_at, t.used_at, t.revoked_at, t.created_at,
              u.email, u.name, inviter.name as invited_by_name
       FROM admin_invite_tokens t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users inviter ON t.invited_by = inviter.id
       WHERE t.used_at IS NULL AND t.revoked_at IS NULL
       ORDER BY t.created_at DESC`
    ).all();
    return withSecurityHeaders(NextResponse.json(result.results || []), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch invites: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const inviterId = (user as any).user_id;
  const inviterName = (user as any).name || 'An admin';

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, traceId);

  try {
    const body = await request.json() as { email?: string; name?: string };
    const { email, name } = body;

    if (!email || !name) {
      return withSecurityHeaders(NextResponse.json({ error: 'Email and name are required' }, { status: 400 }), traceId);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.prepare('SELECT id, admin_approval_status FROM users WHERE email = ?').bind(normalizedEmail).first();
    if (existing) {
      return withSecurityHeaders(NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 }), traceId);
    }

    // Create the user row up front (no password yet - set via accept-invite),
    // matching the shape approveAdminUser/rejectAdminUser already expect.
    const created = await db.prepare(
      `INSERT INTO users (email, name, role, password_hash, email_verified, admin_approval_status, created_at, updated_at)
       VALUES (?, ?, 'admin', '', 0, 'invited', datetime('now'), datetime('now'))
       RETURNING id`
    ).bind(normalizedEmail, name).first() as { id: number } | null;

    if (!created) {
      return withSecurityHeaders(NextResponse.json({ error: 'Failed to create invited user' }, { status: 500 }), traceId);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await db.prepare(
      `INSERT INTO admin_invite_tokens (user_id, token, invited_by, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(created.id, token, inviterId, expiresAt).run();

    const inviteLink = `${PORTAL_BASE_URL}/auth/accept-invite?token=${token}`;
    const emailResult = await sendAdminInviteEmail(normalizedEmail, inviteLink, inviterName);

    await logAuditEvent(db, {
      user_id: inviterId,
      action: 'ADMIN_INVITED',
      resource: 'user',
      resource_id: String(created.id),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ email: normalizedEmail, emailSent: emailResult.success }),
      success: true,
      trace_id: traceId,
    });

    const response = NextResponse.json({
      success: true,
      userId: created.id,
      emailSent: emailResult.success,
      ...(emailResult.success ? {} : { emailError: emailResult.error }),
    }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to create invite: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

export async function DELETE(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return withSecurityHeaders(NextResponse.json({ error: 'Invite id is required' }, { status: 400 }), traceId);
    }

    const result = await db.prepare(
      `UPDATE admin_invite_tokens SET revoked_at = datetime('now') WHERE id = ? AND used_at IS NULL`
    ).bind(parseInt(id)).run();

    if (result.meta.changes === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 }), traceId);
    }

    return withSecurityHeaders(NextResponse.json({ success: true }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to revoke invite: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
