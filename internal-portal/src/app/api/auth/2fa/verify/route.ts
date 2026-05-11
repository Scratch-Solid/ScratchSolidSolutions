export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, logAuditEvent } from '@/lib/db';
import { verifySync } from 'otplib';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { preAuthToken?: string; code?: string; backupCode?: string };
    const { preAuthToken, code, backupCode } = body;

    if (!preAuthToken || (!code && !backupCode)) {
      return NextResponse.json({ error: 'preAuthToken and code or backupCode are required' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const session = await db.prepare(
      `SELECT s.user_id, u.email, u.role, u.name, u.username, u.paysheet_code, u.totp_secret, u.backup_codes, u.password_needs_reset
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    ).bind('pre:' + preAuthToken).first();

    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired pre-auth token' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';

    if (code) {
      const secret = (session as any).totp_secret;
      if (!secret) {
        return NextResponse.json({ error: '2FA not configured' }, { status: 400 });
      }
      const result = verifySync({ token: code, secret });
      const isValid = typeof result === 'object' ? result.valid : result;
      if (!isValid) {
        await logAuditEvent(db, {
          user_id: (session as any).user_id,
          action: '2fa_verify_failed',
          ip_address: ip, user_agent: ua, success: false
        });
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
      }
    } else if (backupCode) {
      const storedHashes: string[] = JSON.parse((session as any).backup_codes || '[]');
      const incoming = crypto.createHash('sha256').update(backupCode.toUpperCase()).digest('hex');
      const idx = storedHashes.indexOf(incoming);
      if (idx === -1) {
        await logAuditEvent(db, {
          user_id: (session as any).user_id,
          action: '2fa_backup_failed',
          ip_address: ip, user_agent: ua, success: false
        });
        return NextResponse.json({ error: 'Invalid backup code' }, { status: 401 });
      }
      storedHashes.splice(idx, 1);
      await db.prepare('UPDATE users SET backup_codes = ? WHERE id = ?')
        .bind(JSON.stringify(storedHashes), (session as any).user_id).run();
    }

    await db.prepare('DELETE FROM sessions WHERE token = ?').bind('pre:' + preAuthToken).run();

    const sessionToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    await db.prepare(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`
    ).bind((session as any).user_id, sessionToken).run();

    await logAuditEvent(db, {
      user_id: (session as any).user_id,
      action: '2fa_verify_success',
      ip_address: ip, user_agent: ua, success: true
    });

    return NextResponse.json({
      success: true,
      token: sessionToken,
      role: (session as any).role,
      username: (session as any).username || (session as any).email,
      user_id: String((session as any).user_id),
      paysheet_code: (session as any).paysheet_code || '',
      mustChangePassword: (session as any).password_needs_reset === 1,
      user: {
        id: (session as any).user_id,
        email: (session as any).email,
        name: (session as any).name,
        role: (session as any).role
      }
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ error: '2FA verification failed' }, { status: 500 });
  }
}
