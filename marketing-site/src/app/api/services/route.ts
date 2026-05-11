export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const services = await db.prepare(
      `SELECT * FROM services WHERE is_active = 1 ORDER BY display_order ASC`
    ).all();
    
    return NextResponse.json(services.results || []);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as { 
      name?: string; 
      description?: string; 
      icon?: string; 
      display_order?: number; 
      active?: boolean 
    };
    
    const { name, description, icon, display_order, active } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `INSERT INTO services (name, description, icon, display_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      name, 
      description || null, 
      icon || null, 
      display_order || 0, 
      active !== false ? 1 : 0
    ).run();
    
    return NextResponse.json({ id: result.meta.last_row_id, success: true });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
