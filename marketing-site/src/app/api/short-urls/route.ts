export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promoCodeId, promoCode } = body;

    if (!promoCodeId || !promoCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate short code (6 characters)
    const shortCode = nanoid(6);
    
    // Generate short URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org';
    const shortUrl = `${baseUrl}/p/${shortCode}`;
    const targetUrl = `${baseUrl}/services?promo=${promoCode}`;

    // Store in KV (if available)
    try {
      const kv = (request.env as any)?.KV;
      if (kv) {
        await kv.put(`short:${shortCode}`, JSON.stringify({
          targetUrl,
          promoCodeId,
          promoCode,
          createdAt: new Date().toISOString()
        }), {
          expirationTtl: 365 * 24 * 60 * 60 // 1 year
        });
      }
    } catch (kvError) {
      console.warn('KV not available, using database fallback:', kvError);
    }

    // Fallback: Store in database if KV is not available
    const db = await getDb();
    if (db) {
      await db.prepare(
        `INSERT INTO short_urls (short_code, target_url, promo_code_id, promo_code, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind(shortCode, targetUrl, promoCodeId, promoCode).run();
    }

    return NextResponse.json({
      success: true,
      shortUrl,
      shortCode,
      targetUrl,
      promoCode
    });

  } catch (error) {
    console.error('Error creating short URL:', error);
    return NextResponse.json(
      { error: 'Failed to create short URL' },
      { status: 500 }
    );
  }
}
