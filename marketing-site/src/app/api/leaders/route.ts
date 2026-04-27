import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const leaders = await db.prepare(
      `SELECT * FROM leaders ORDER BY display_order ASC`
    ).all();
    
    return NextResponse.json(leaders.results || []);
  } catch (error) {
    console.error('Error fetching leaders:', error);
    return NextResponse.json({ error: 'Failed to fetch leaders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    const body = await request.json() as { name?: string; title?: string; image_url?: string; description?: string; display_order?: number; active?: boolean };
    
    const { name, title, image_url, description, display_order, active } = body;
    
    if (!name || !title) {
      return NextResponse.json({ error: 'Name and title are required' }, { status: 400 });
    }
    
    if (!name || name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 });
    }
    
    if (!title || title.length < 2 || title.length > 100) {
      return NextResponse.json({ error: 'Title must be between 2 and 100 characters' }, { status: 400 });
    }
    
    if (description && description.length > 500) {
      return NextResponse.json({ error: 'Description must be less than 500 characters' }, { status: 400 });
    }
    
    if (image_url && !image_url.match(/^https?:\/\//)) {
      return NextResponse.json({ error: 'Image URL must start with http:// or https://' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `INSERT INTO leaders (name, title, image_url, description, display_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(name, title, image_url || null, description || null, display_order || 0, active !== false ? 1 : 0).run();
    
    return NextResponse.json({ id: result.meta.last_row_id, success: true });
  } catch (error) {
    console.error('Error creating leader:', error);
    return NextResponse.json({ error: 'Failed to create leader' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    const body = await request.json() as { id?: number; name?: string; title?: string; image_url?: string; description?: string; display_order?: number; active?: boolean };
    
    const { id, name, title, image_url, description, display_order, active } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    if (name && (name.length < 2 || name.length > 100)) {
      return NextResponse.json({ error: 'Name must be between 2 and 100 characters' }, { status: 400 });
    }
    
    if (title && (title.length < 2 || title.length > 100)) {
      return NextResponse.json({ error: 'Title must be between 2 and 100 characters' }, { status: 400 });
    }
    
    if (description && description.length > 500) {
      return NextResponse.json({ error: 'Description must be less than 500 characters' }, { status: 400 });
    }
    
    if (image_url && !image_url.match(/^https?:\/\//)) {
      return NextResponse.json({ error: 'Image URL must start with http:// or https://' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `UPDATE leaders 
       SET name = COALESCE(?, name),
           title = COALESCE(?, title),
           image_url = COALESCE(?, image_url),
           description = COALESCE(?, description),
           display_order = COALESCE(?, display_order),
           is_active = COALESCE(?, is_active),
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name || null, title || null, image_url || null, description || null, display_order || null, active !== undefined ? (active ? 1 : 0) : null, id).run();
    
    if (result.meta.rows_written === 0) {
      return NextResponse.json({ error: 'Leader not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating leader:', error);
    return NextResponse.json({ error: 'Failed to update leader' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const result = await db.prepare(`DELETE FROM leaders WHERE id = ?`).bind(id).run();
    
    if (result.meta.rows_written === 0) {
      return NextResponse.json({ error: 'Leader not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting leader:', error);
    return NextResponse.json({ error: 'Failed to delete leader' }, { status: 500 });
  }
}
