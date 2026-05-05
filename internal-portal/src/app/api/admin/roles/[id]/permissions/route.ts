import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { permission_id?: number };
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
    const response = NextResponse.json({ error: 'Failed to assign permission to role' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

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
    const response = NextResponse.json({ error: 'Failed to remove permission from role' }, { status: 500 });
  }
}
