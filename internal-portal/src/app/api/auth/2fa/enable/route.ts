export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAccessToken, generateTOTPSecret, generateTOTPURI } from '@/lib/auth';
import crypto from 'crypto';

/**
 * Enable 2FA Endpoint
 * 
 * Generates a TOTP secret and QR code URI for the user to set up 2FA.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header required'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    // Get user email
    const userResult = await db.prepare(
      'SELECT email FROM users WHERE id = ?'
    ).bind(decoded.userId).first();

    if (!userResult) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Generate TOTP secret
    const secret = generateTOTPSecret();
    const qrCodeURI = generateTOTPURI((userResult as any).email, secret);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store TOTP secret (not enabled yet - requires verification)
    await db.prepare(
      `INSERT INTO user_2fa (user_id, secret, enabled, backup_codes)
       VALUES (?, ?, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET secret = ?, backup_codes = ?, enabled = 0`
    ).bind(decoded.userId, secret, JSON.stringify(backupCodes), secret, JSON.stringify(backupCodes)).run();

    return NextResponse.json({
      success: true,
      secret,
      qrCodeURI,
      backupCodes,
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
