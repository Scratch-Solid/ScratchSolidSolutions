export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAccessToken, verifyTOTP, logAuthEvent } from '@/lib/auth';

/**
 * Confirm 2FA Endpoint
 * 
 * Verifies the TOTP code and enables 2FA for the user.
 * This should be called after the user scans the QR code.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { code: string };
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';

    const totpRecord = await db.prepare(
      'SELECT * FROM user_2fa WHERE user_id = ?'
    ).bind(decoded.userId).first();

    if (!totpRecord) {
      return NextResponse.json({ error: '2FA not configured. Please call /enable first.' }, { status: 400 });
    }

    if ((totpRecord as any).enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }

    const secret = (totpRecord as any).secret;
    if (!secret) {
      return NextResponse.json({ error: '2FA secret missing in database' }, { status: 500 });
    }

    const isValid = verifyTOTP(code, secret);
    
    if (!isValid) {
      await logAuthEvent(db, decoded.userId, '2fa_enable_failed', ip, ua);
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
    }

    await db.prepare(
      'UPDATE user_2fa SET enabled = 1, last_used_at = ? WHERE user_id = ?'
    ).bind(Math.floor(Date.now() / 1000), decoded.userId).run();

    await logAuthEvent(db, decoded.userId, '2fa_enabled', ip, ua);

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('Confirm 2FA error:', error);
    return NextResponse.json({ error: '2FA confirmation failed' }, { status: 500 });
  }
}
