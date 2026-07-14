export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const roles = await db.prepare(`
      SELECT r.*,
        GROUP_CONCAT(p.name) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
    `).all();

    const permissions = await db.prepare('SELECT * FROM permissions ORDER BY resource, action').all();

    // The admin Roles page expects { roles, permissions } - it used to get a
    // bare array back, so `data.roles`/`data.permissions` were always
    // undefined and `roles.map(...)` threw at render time (a full page
    // crash), and the separate "System Permissions" panel never had data.
    return NextResponse.json({
      roles: roles.results || [],
      permissions: permissions.results || [],
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch roles: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { name?: string; description?: string };
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing role name' }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO roles (name, description) VALUES (?, ?)'
    ).bind(name, description || '').run();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
