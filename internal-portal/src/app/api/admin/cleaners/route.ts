import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = `
      SELECT cp.*, u.email, u.role, u.deleted as user_deleted
      FROM cleaner_profiles cp
      JOIN users u ON cp.user_id = u.id
    `;
    const params: any[] = [];

    if (status) {
      query += ' WHERE cp.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cp.created_at DESC';

    const cleaners = await db.prepare(query).bind(...params).all();
    const response = NextResponse.json(cleaners.results || []);
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300, s-maxage=60');
    return response;
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch cleaners' }, { status: 500 });
    return response;
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { cleaner_id?: number; blocked?: boolean; status?: string };
    const { cleaner_id, blocked, status } = body;

    if (!cleaner_id) {
      return NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (blocked !== undefined) {
      updates.push('blocked = ?');
      values.push(blocked ? 1 : 0);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime("now")');
    values.push(cleaner_id);

    await db.prepare(
      `UPDATE cleaner_profiles SET ${updates.join(', ')} WHERE user_id = ?`
    ).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to update cleaner' }, { status: 500 });
    return response;
  }
}
