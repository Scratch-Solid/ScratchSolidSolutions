import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const body = await request.json();
    const { permission_id } = body;
    const roleId = params.id;

    if (!permission_id) {
      return NextResponse.json({ error: 'Missing permission_id' }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
    ).bind(roleId, permission_id).run();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error assigning permission to role:', error);
    return NextResponse.json({ error: 'Failed to assign permission' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const permission_id = searchParams.get('permission_id');
    const roleId = params.id;

    if (!permission_id) {
      return NextResponse.json({ error: 'Missing permission_id' }, { status: 400 });
    }

    await db.prepare(
      'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?'
    ).bind(roleId, permission_id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing permission from role:', error);
    return NextResponse.json({ error: 'Failed to remove permission' }, { status: 500 });
  }
}
