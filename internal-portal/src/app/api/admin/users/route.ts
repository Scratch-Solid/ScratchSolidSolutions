export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const deleted = searchParams.get('deleted');

    let query = 'SELECT * FROM users';
    const conditions: string[] = [];
    const params: any[] = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (deleted !== null) {
      conditions.push('deleted = ?');
      params.push(deleted === '1' ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const users = await db.prepare(query).bind(...params).all();
    return NextResponse.json(users.results || []);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { user_id?: number; role?: string; deleted?: boolean };
    const { user_id, role, deleted } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (role) {
      updates.push('role = ?');
      values.push(role);
    }

    if (deleted !== undefined) {
      updates.push('deleted = ?');
      updates.push('soft_delete_at = ?');
      values.push(deleted ? 1 : 0);
      values.push(deleted ? new Date().toISOString() : null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime("now")');
    values.push(user_id);

    await db.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
