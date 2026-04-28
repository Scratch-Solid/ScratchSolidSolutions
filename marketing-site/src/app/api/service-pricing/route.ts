import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('service_id');
    const clientType = searchParams.get('client_type'); // 'individual' | 'business' | null (all)
    
    let query = `SELECT sp.*, s.name as service_name FROM service_pricing sp LEFT JOIN services s ON sp.service_id = s.id`;
    const conditions: string[] = [];
    const params: unknown[] = [];
    
    if (serviceId) {
      conditions.push(`sp.service_id = ?`);
      params.push(serviceId);
    }
    if (clientType) {
      conditions.push(`(sp.client_type = ? OR sp.client_type = 'all')`);
      params.push(clientType);
    }
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }
    
    query += ` ORDER BY sp.client_type ASC, sp.min_quantity ASC`;
    
    const pricing = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(pricing.results || []);
  } catch (error) {
    console.error('Error fetching service pricing:', error);
    return NextResponse.json({ error: 'Failed to fetch service pricing' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as {
      service_id?: number; min_quantity?: number; max_quantity?: number;
      price?: number; unit?: string; client_type?: string;
      special_price?: number | null; special_label?: string;
      special_valid_from?: string | null; special_valid_until?: string | null;
    };
    
    const { service_id, min_quantity, max_quantity, price, unit, client_type,
            special_price, special_label, special_valid_from, special_valid_until } = body;
    
    if (!service_id || !price) {
      return NextResponse.json({ error: 'Service ID and price are required' }, { status: 400 });
    }
    
    const validTypes = ['individual', 'business', 'all'];
    if (client_type && !validTypes.includes(client_type)) {
      return NextResponse.json({ error: 'client_type must be individual, business, or all' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `INSERT INTO service_pricing
        (service_id, min_quantity, max_quantity, price, unit, client_type,
         special_price, special_label, special_valid_from, special_valid_until, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      service_id, min_quantity || null, max_quantity || null, price, unit || null,
      client_type || 'all', special_price ?? null, special_label || '',
      special_valid_from || null, special_valid_until || null
    ).run();
    
    return NextResponse.json({ id: result.meta.last_row_id, success: true });
  } catch (error) {
    console.error('Error creating service pricing:', error);
    return NextResponse.json({ error: 'Failed to create service pricing' }, { status: 500 });
  }
}
