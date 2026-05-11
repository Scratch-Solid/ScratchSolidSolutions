export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const services = await db.prepare(
      `SELECT * FROM services ORDER BY display_order ASC`
    ).all();
    
    return NextResponse.json(services.results || []);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
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

export async function PUT(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { 
      id?: number;
      name?: string; 
      description?: string; 
      icon?: string; 
      display_order?: number; 
      active?: boolean 
    };
    
    const { id, name, description, icon, display_order, active } = body;
    
    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `UPDATE services 
       SET name = ?, description = ?, icon = ?, display_order = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      name, 
      description || null, 
      icon || null, 
      display_order || 0, 
      active !== false ? 1 : 0,
      id
    ).run();
    
    if (result.meta.changes === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `DELETE FROM services WHERE id = ?`
    ).bind(parseInt(id)).run();
    
    if (result.meta.changes === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}
