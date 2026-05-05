import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('role_id');

    let result;
    if (roleId) {
      result = await db.prepare(`
        SELECT rp.*, p.name as permission_name, p.resource, p.action
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ?
      `).bind(parseInt(roleId)).all();
    } else {
      result = await db.prepare('SELECT * FROM role_permissions ORDER BY created_at DESC').all();
    }

    return NextResponse.json(result.results || []);
  } catch (error) {
    logger.error('Error fetching role permissions', error as Error);
    return NextResponse.json({ error: 'Failed to fetch role permissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      role_id?: number;
      permission_id?: number;
    };

    const { role_id, permission_id } = body;

    if (!role_id || !permission_id) {
      return NextResponse.json({ error: 'Missing required fields: role_id, permission_id' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, datetime('now')) RETURNING *`
    ).bind(role_id, permission_id).first();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('Error creating role permission', error as Error);
    return NextResponse.json({ error: 'Failed to create role permission' }, { status: 500 });
  }
}
