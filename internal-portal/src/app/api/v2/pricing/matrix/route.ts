import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    const result = await db.prepare(`
      SELECT service_type, base_price, transport_fee, weekend_surcharge, holiday_surcharge, rush_surcharge
      FROM pricing_config
      WHERE is_active = 1 OR is_active IS NULL
    `).all<{
      service_type: string;
      base_price: number;
      transport_fee: number;
      weekend_surcharge: number;
      holiday_surcharge: number;
      rush_surcharge: number;
    }>();

    const pricingMatrix = {};
    for (const row of result.results || []) {
      pricingMatrix[row.service_type] = {
        basePrice: row.base_price,
        transportFee: row.transport_fee,
        weekendSurcharge: row.weekend_surcharge,
        holidaySurcharge: row.holiday_surcharge,
        rushSurcharge: row.rush_surcharge
      };
    }

    return NextResponse.json(pricingMatrix);
  } catch (error) {
    console.error('Pricing matrix error:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing matrix' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceType, basePrice, transportFee, weekendSurcharge, holidaySurcharge, rushSurcharge } = body;

    if (!serviceType || basePrice === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    await db.prepare(`
      INSERT INTO pricing_config (service_type, base_price, transport_fee, weekend_surcharge, holiday_surcharge, rush_surcharge, effective_from, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'admin')
      ON CONFLICT(service_type) DO UPDATE SET
        base_price = excluded.base_price,
        transport_fee = excluded.transport_fee,
        weekend_surcharge = excluded.weekend_surcharge,
        holiday_surcharge = excluded.holiday_surcharge,
        rush_surcharge = excluded.rush_surcharge,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = 'admin'
    `).bind(serviceType, basePrice, transportFee, weekendSurcharge, holidaySurcharge, rushSurcharge).run();

    return NextResponse.json({ success: true, message: 'Pricing updated successfully' });
  } catch (error) {
    console.error('Pricing update error:', error);
    return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 });
  }
}
