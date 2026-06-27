export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAccessToken, verifyTOTP, logAuthEvent } from '@/lib/auth';
import crypto from 'crypto';

/**
 * Verify 2FA Endpoint
 * 
 * Verifies TOTP code or backup code during login or 2FA setup.
 * Updated to work with JWT-based authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { code?: string; backupCode?: string };
    const { code, backupCode } = body;

    if (!code && !backupCode) {
      return NextResponse.json({ error: 'code or backupCode is required' }, { status: 400 });
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

    // Get user's 2FA settings
    const totpRecord = await db.prepare(
      'SELECT * FROM user_2fa WHERE user_id = ?'
    ).bind(decoded.userId).first();

    if (!totpRecord) {
      return NextResponse.json({ error: '2FA not configured' }, { status: 400 });
    }

    if (!(totpRecord as any).enabled) {
      return NextResponse.json({ error: '2FA is not enabled for this account' }, { status: 400 });
    }

    if (code) {
      const secret = (totpRecord as any).secret;
      const isValid = verifyTOTP(code, secret);
      
      if (!isValid) {
        await logAuthEvent(db, decoded.userId, '2fa_verify_failed', ip, ua);
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
      }

      // Update last used timestamp
      await db.prepare(
        'UPDATE user_2fa SET last_used_at = ? WHERE user_id = ?'
      ).bind(Math.floor(Date.now() / 1000), decoded.userId).run();

    } else if (backupCode) {
      const storedCodes: string[] = JSON.parse((totpRecord as any).backup_codes || '[]');
      const incoming = backupCode.toUpperCase();
      const idx = storedCodes.indexOf(incoming);
      
      if (idx === -1) {
        await logAuthEvent(db, decoded.userId, '2fa_backup_failed', ip, ua);
        return NextResponse.json({ error: 'Invalid backup code' }, { status: 401 });
      }

      // Remove used backup code
      storedCodes.splice(idx, 1);
      await db.prepare(
        'UPDATE user_2fa SET backup_codes = ? WHERE user_id = ?'
      ).bind(JSON.stringify(storedCodes), decoded.userId).run();
    }

    await logAuthEvent(db, decoded.userId, '2fa_verify_success', ip, ua);

    return NextResponse.json({
      success: true,
      message: '2FA verified successfully'
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ error: '2FA verification failed' }, { status: 500 });
  }
}
