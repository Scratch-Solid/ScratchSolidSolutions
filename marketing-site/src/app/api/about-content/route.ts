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
    
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    
    let query = `SELECT * FROM about_us_content`;
    let params: any[] = [];
    
    if (section) {
      query += ` WHERE section = ?`;
      params.push(section);
    }
    
    query += ` ORDER BY section ASC, display_order ASC`;
    
    const content = await db.prepare(query).bind(...params).all();
    
    return NextResponse.json(content.results || []);
  } catch (error) {
    console.error('Error fetching about content:', error);
    return NextResponse.json({ error: 'Failed to fetch about content' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { section?: string; title?: string; content?: string; display_order?: number; active?: boolean };
    
    const { section, title, content, display_order, active } = body;
    
    const validSections = ['about-main', 'mission', 'vision', 'values'];
    if (!section || !validSections.includes(section)) {
      return NextResponse.json({ error: `Section must be one of: ${validSections.join(', ')}` }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    if (content.length > 5000) {
      return NextResponse.json({ error: 'Content must be less than 5000 characters' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `INSERT INTO about_us_content (section, title, content, display_order, active, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(section, title, content, display_order || 0, active !== false ? 1 : 0).run();
    
    return NextResponse.json({ id: result.meta.last_row_id, success: true });
  } catch (error) {
    console.error('Error creating about content:', error);
    return NextResponse.json({ error: 'Failed to create about content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { id?: number; title?: string; content?: string; display_order?: number; active?: boolean };
    
    const { id, title, content, display_order, active } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    if (content && content.length > 5000) {
      return NextResponse.json({ error: 'Content must be less than 5000 characters' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `UPDATE about_us_content 
       SET title = COALESCE(?, title),
           content = COALESCE(?, content),
           display_order = COALESCE(?, display_order),
           active = COALESCE(?, active),
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(title || null, content || null, display_order || null, active !== undefined ? (active ? 1 : 0) : null, id).run();
    
    if (result.meta.rows_written === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating about content:', error);
    return NextResponse.json({ error: 'Failed to update about content' }, { status: 500 });
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
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const result = await db.prepare(`DELETE FROM about_us_content WHERE id = ?`).bind(id).run();
    
    if (result.meta.rows_written === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting about content:', error);
    return NextResponse.json({ error: 'Failed to delete about content' }, { status: 500 });
  }
}
