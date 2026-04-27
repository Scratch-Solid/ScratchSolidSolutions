import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('service_id');
    
    let query = `SELECT sp.*, s.name as service_name FROM service_pricing sp LEFT JOIN services s ON sp.service_id = s.id`;
    let params: any[] = [];
    
    if (serviceId) {
      query += ` WHERE sp.service_id = ?`;
      params.push(serviceId);
    }
    
    query += ` ORDER BY sp.min_quantity ASC`;
    
    const pricing = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(pricing.results || []);
  } catch (error) {
    console.error('Error fetching service pricing:', error);
    return NextResponse.json({ error: 'Failed to fetch service pricing' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    const body = await request.json();
    
    const { service_id, min_quantity, max_quantity, price, unit } = body;
    
    if (!service_id || !price) {
      return NextResponse.json({ error: 'Service ID and price are required' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `INSERT INTO service_pricing (service_id, min_quantity, max_quantity, price, unit, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(service_id, min_quantity || null, max_quantity || null, price, unit || null).run();
    
    return NextResponse.json({ id: result.meta.last_row_id, success: true });
  } catch (error) {
    console.error('Error creating service pricing:', error);
    return NextResponse.json({ error: 'Failed to create service pricing' }, { status: 500 });
  }
}
