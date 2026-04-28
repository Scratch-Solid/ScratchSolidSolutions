import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const permissions = await db.prepare('SELECT * FROM permissions ORDER BY resource, action').all();
    return NextResponse.json(permissions.results || []);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { name?: string; description?: string; resource?: string; action?: string };
    const { name, description, resource, action } = body;

    if (!name || !resource || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO permissions (name, description, resource, action) VALUES (?, ?, ?, ?)'
    ).bind(name, description || '', resource, action).run();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 });
  }
}
