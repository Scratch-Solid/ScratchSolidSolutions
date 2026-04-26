import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const roles = await db.prepare(`
      SELECT r.*, 
        GROUP_CONCAT(p.name) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
    `).all();

    return NextResponse.json(roles.results || []);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing role name' }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO roles (name, description) VALUES (?, ?)'
    ).bind(name, description || '').run();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
