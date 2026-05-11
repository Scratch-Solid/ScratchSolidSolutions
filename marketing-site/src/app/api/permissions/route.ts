export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const result = await db.prepare('SELECT * FROM permissions ORDER BY created_at DESC').all();
    return NextResponse.json(result.results || []);
  } catch (error) {
    logger.error('Error fetching permissions', error as Error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
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
      name?: string;
      description?: string;
      resource?: string;
      action?: string;
    };

    const { name, description, resource, action } = body;

    if (!name || !resource || !action) {
      return NextResponse.json({ error: 'Missing required fields: name, resource, action' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO permissions (name, description, resource, action, created_at) VALUES (?, ?, ?, ?, datetime('now')) RETURNING *`
    ).bind(name, description || '', resource, action).first();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('Error creating permission', error as Error);
    return NextResponse.json({ error: 'Failed to create permission' }, { status: 500 });
  }
}
