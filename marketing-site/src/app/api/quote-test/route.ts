import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as {
      name?: string;
      service_id?: number;
      baseline_price?: number;
      final_price?: number;
    };

    const {
      name, service_id,
      baseline_price, final_price
    } = body;

    // Validate required fields
    if (!name || !service_id || baseline_price === undefined || final_price === undefined) {
      return NextResponse.json({ error: 'name, service_id, baseline_price, and final_price are required' }, { status: 400 });
    }

    // Simple sanitization
    const sanitizedName = name.trim();

    // Validate service_id exists
    const service = await db.prepare('SELECT id FROM services WHERE id = ? AND is_active = 1').bind(service_id).first();
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Generate reference number
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const refNumber = `SSQ-${ts}-${rand}`;

    // Save quote request to DB
    const result = await db.prepare(
      `INSERT INTO quote_requests
        (ref_number, name, service_id, service_name,
         baseline_price, final_price, status, created_at, updated_at, client_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'), 'individual')`
    ).bind(
      refNumber,
      sanitizedName,
      service_id,
      'Test Service',
      baseline_price,
      final_price
    ).run();

    const quoteId = result.meta.last_row_id;

    return NextResponse.json({
      success: true,
      id: quoteId,
      ref_number: refNumber,
      zoho_estimate_number: '',
      name: sanitizedName,
      baseline_price,
      final_price,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create quote', details: errorMessage }, { status: 500 });
  }
}
