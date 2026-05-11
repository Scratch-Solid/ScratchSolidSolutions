export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user, db } = authResult;

  try {
    const secret = generateSecret();
    const otpAuthUrl = generateURI({
      label: (user as any).email,
      issuer: 'Scratch Solid Portal',
      secret
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    const backupCodes: string[] = Array.from({ length: 10 }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase()
    );
    const hashedCodes = backupCodes.map(c => crypto.createHash('sha256').update(c).digest('hex'));

    await db.prepare(
      `UPDATE users SET totp_secret = ?, backup_codes = ? WHERE id = ?`
    ).bind(secret, JSON.stringify(hashedCodes), (user as any).user_id).run();

    return NextResponse.json({
      success: true,
      data: { secret, qrCodeUrl: qrCodeDataUrl, backupCodes }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}
