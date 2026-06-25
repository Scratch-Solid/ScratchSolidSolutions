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
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (verifyErr) {
      return NextResponse.json({ error: 'Token verify error: ' + (verifyErr instanceof Error ? verifyErr.message : String(verifyErr)) }, { status: 500 });
    }

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    let db;
    try {
      db = await getDb();
    } catch (dbErr) {
      return NextResponse.json({ error: 'DB connect error: ' + (dbErr instanceof Error ? dbErr.message : String(dbErr)) }, { status: 500 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    let totpRecord;
    try {
      totpRecord = await db.prepare(
        'SELECT * FROM user_2fa WHERE user_id = ?'
      ).bind(decoded.userId).first();
    } catch (queryErr) {
      return NextResponse.json({ error: 'DB query error: ' + (queryErr instanceof Error ? queryErr.message : String(queryErr)) }, { status: 500 });
    }

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

    let isValid;
    try {
      isValid = verifyTOTP(code, secret);
    } catch (totpError) {
      return NextResponse.json({ error: 'TOTP verification error: ' + (totpError instanceof Error ? totpError.message : String(totpError)) }, { status: 500 });
    }
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
    }

    // Enable 2FA
    await db.prepare(
      'UPDATE user_2fa SET enabled = 1, last_used_at = ? WHERE user_id = ?'
    ).bind(Math.floor(Date.now() / 1000), decoded.userId).run();

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('Confirm 2FA error:', error);
    return NextResponse.json({ error: '2FA confirmation failed: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
