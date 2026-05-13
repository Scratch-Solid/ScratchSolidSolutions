export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import QRCode from 'qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const promoId = parseInt(params.id);
    if (isNaN(promoId)) {
      return NextResponse.json({ error: 'Invalid promo code ID' }, { status: 400 });
    }

    // Fetch promo code from database
    const promo = await db.prepare(
      `SELECT code, description, discount_type, discount_value FROM promo_codes WHERE id = ?`
    ).bind(promoId).first();

    if (!promo) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    const p = promo as Record<string, unknown>;

    // Generate shareable URL for the promo code
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org';
    const shareUrl = `${baseUrl}/services?promo=${p.code}`;

    // Generate QR code
    // Size: 300x300 pixels (reasonable size for mobile scanning)
    // Error correction level: M (medium, 15% error correction)
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return NextResponse.json({
      success: true,
      qrCode: qrDataUrl,
      shareUrl: shareUrl,
      code: p.code,
      description: p.description,
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
