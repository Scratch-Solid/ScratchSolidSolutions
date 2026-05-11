export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { logAuditEvent } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin', 'cleaner', 'transport', 'digital']);
  if (authResult instanceof NextResponse) return authResult;
  const { user, db } = authResult;

  try {
    const sessions = await db.prepare(
      `SELECT id, created_at, expires_at, ip_address, user_agent FROM sessions WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC`
    ).bind(user.user_id).all();

    return NextResponse.json({
      success: true,
      data: { sessions: sessions.results || [] }
    });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await withAuth(request, ['admin', 'cleaner', 'transport', 'digital']);
  if (authResult instanceof NextResponse) return authResult;
  const { user, db } = authResult;

  try {
    const body = await request.json() as { session_id?: number; revoke_all?: boolean };
    const currentToken = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (body.revoke_all) {
      await db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?')
        .bind(user.user_id, currentToken || '').run();
    } else if (body.session_id) {
      await db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?')
        .bind(body.session_id, user.user_id).run();
    } else {
      return NextResponse.json({ error: 'session_id or revoke_all required' }, { status: 400 });
    }

    await logAuditEvent(db, {
      user_id: user.user_id,
      action: 'session_revoked',
      resource: 'session',
      details: body.revoke_all ? 'All other sessions revoked' : `Session ${body.session_id} revoked`,
      success: true
    });

    return NextResponse.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Session revoke error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
