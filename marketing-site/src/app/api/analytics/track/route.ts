export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRateLimit } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP to prevent abuse
    const rateLimitResult = await withRateLimit(request, { windowMs: 60000, maxRequests: 10 });
    if (rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json() as {
      eventType?: string;
      promoCode?: string;
      promoCodeId?: number;
      referrer?: string;
      userAgent?: string;
      url?: string;
      timestamp?: string;
    };
    const { eventType, promoCode, promoCodeId, referrer, userAgent, url, timestamp } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get client IP (if available)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('cf-connecting-ip') || 
               'unknown';

    // Track based on event type. Deliberately does NOT increment
    // promo_codes.used_count here - this endpoint is public and unauthenticated,
    // so a client-reported "I applied this promo" event is not proof of an
    // actual redemption. Real usage counting happens server-side in the
    // booking/quote creation routes, atomically with the booking itself.
    if (eventType === 'page_view' && promoCode) {
      // Track page view with promo code
      await db.prepare(
        `INSERT INTO promo_scans (promo_code_id, promo_code, scan_timestamp, referrer, user_agent, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        promoCodeId || null,
        promoCode,
        timestamp || new Date().toISOString(),
        referrer || '',
        userAgent || '',
        ip
      ).run();
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error tracking analytics event:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
