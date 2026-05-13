import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      promoCodeId: number;
      promoCode: string;
      channel: string;
      recipientCount: number;
      notes: string;
    };
    const { promoCodeId, promoCode, channel, recipientCount, notes } = body;

    if (!promoCodeId || !promoCode || !channel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Record the distribution
    await db.prepare(
      `INSERT INTO promo_distribution (promo_code_id, promo_code, channel, recipient_count, distributed_by, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      promoCodeId,
      promoCode,
      channel,
      recipientCount || 1,
      'admin', // In production, this would be the actual admin user ID
      notes || ''
    ).run();

    // Update distribution count on promo code
    await db.prepare(
      `UPDATE promo_codes 
       SET distribution_count = distribution_count + 1,
           last_distributed_at = datetime('now')
       WHERE id = ?`
    ).bind(promoCodeId).run();

    // Update distribution channels JSON array
    const promo = await db.prepare(
      `SELECT distribution_channels FROM promo_codes WHERE id = ?`
    ).bind(promoCodeId).first() as Record<string, unknown> | null;

    if (promo) {
      let channels: string[] = [];
      try {
        channels = JSON.parse((promo.distribution_channels as string) || '[]');
      } catch {
        channels = [];
      }

      if (!channels.includes(channel)) {
        channels.push(channel);
        await db.prepare(
          `UPDATE promo_codes SET distribution_channels = ? WHERE id = ?`
        ).bind(JSON.stringify(channels), promoCodeId).run();
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Promo code distributed successfully'
    });

  } catch (error) {
    console.error('Error distributing promo code:', error);
    return NextResponse.json(
      { error: 'Failed to distribute promo code' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promoCodeId = searchParams.get('promoCodeId');

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    let query = 'SELECT * FROM promo_distribution';
    let params: (string | number)[] = [];

    if (promoCodeId) {
      query += ' WHERE promo_code_id = ?';
      params.push(parseInt(promoCodeId));
    }

    query += ' ORDER BY distributed_at DESC LIMIT 50';

    const distributions = await db.prepare(query).bind(...params).all();

    return NextResponse.json({
      success: true,
      distributions: distributions.results
    });

  } catch (error) {
    console.error('Error fetching distribution history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch distribution history' },
      { status: 500 }
    );
  }
}
