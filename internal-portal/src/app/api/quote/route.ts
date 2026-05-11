export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as {
      name: string;
      email: string;
      phone: string;
      service_id: number;
      service_name: string;
      client_type: string;
      quantity: number;
      baseline_price: number;
      special_price: number | null;
      special_label: string;
      special_discount: number;
      promo_code: string;
      discount_type: string;
      discount_value: number;
      discount_amount: number;
      final_price: number;
    };

    const {
      name,
      email,
      phone,
      service_id,
      service_name,
      client_type,
      quantity,
      baseline_price,
      special_price,
      special_label,
      special_discount,
      promo_code,
      discount_type,
      discount_value,
      discount_amount,
      final_price
    } = body;

    // Generate unique reference number
    const refNumber = `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create quote
    const result = await db.prepare(
      `INSERT INTO quotes
        (ref_number, name, email, phone, service_id, service_name, client_type, quantity,
         baseline_price, special_price, special_label, special_discount, promo_code,
         discount_type, discount_value, discount_amount, final_price, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
    ).bind(
      refNumber,
      name,
      email,
      phone,
      service_id,
      service_name,
      client_type,
      quantity,
      baseline_price,
      special_price,
      special_label,
      special_discount,
      promo_code,
      discount_type,
      discount_value,
      discount_amount,
      final_price
    ).run();

    const quoteId = result.meta.last_row_id;

    // Update promo code usage if applicable
    if (promo_code) {
      await db.prepare(
        `UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?`
      ).bind(promo_code.toUpperCase()).run();
    }

    // Return quote details
    const quote = await db.prepare(
      `SELECT * FROM quotes WHERE id = ?`
    ).bind(quoteId).first();

    return NextResponse.json({
      id: quote.id,
      ref_number: quote.ref_number,
      zoho_estimate_number: quote.zoho_estimate_number,
      service_name: quote.service_name,
      baseline_price: quote.baseline_price,
      special_price: quote.special_price,
      special_label: quote.special_label,
      special_discount: quote.special_discount,
      promo_code: quote.promo_code,
      discount_type: quote.discount_type,
      discount_amount: quote.discount_amount,
      final_price: quote.final_price,
      client_type: quote.client_type
    });

  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    let query = `SELECT q.*, s.name as service_icon, s.icon as service_icon 
                FROM quotes q 
                LEFT JOIN services s ON q.service_id = s.id`;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      conditions.push(`q.status = ?`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY q.created_at DESC`;

    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));
    }

    const quotes = await db.prepare(query).bind(...params).all();

    return NextResponse.json(quotes.results || []);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json() as { status?: string };

    if (!id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const result = await db.prepare(
      `UPDATE quotes SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(status, parseInt(id)).run();

    if (result.meta.changes === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
