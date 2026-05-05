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
    const result = await db.prepare('SELECT * FROM roles ORDER BY created_at DESC').all();
    return NextResponse.json(result.results || []);
  } catch (error) {
    logger.error('Error fetching roles', error as Error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
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
    };

    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO roles (name, description, created_at) VALUES (?, ?, datetime('now')) RETURNING *`
    ).bind(name, description || '').first();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('Error creating role', error as Error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
