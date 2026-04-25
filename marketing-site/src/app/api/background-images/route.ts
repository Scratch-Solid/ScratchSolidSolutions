import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const result = await db.prepare('SELECT * FROM background_images ORDER BY created_at DESC').all();
    return NextResponse.json(result.results || []);
  } catch (error) {
    logger.error('Error fetching background images', error as Error);
    return NextResponse.json({ error: 'Failed to fetch background images' }, { status: 500 });
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
      url?: string;
      name?: string;
      is_active?: number;
    };

    const { url, name, is_active = 0 } = body;

    if (!url || !name) {
      return NextResponse.json({ error: 'Missing required fields: url, name' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO background_images (url, name, is_active, created_at) VALUES (?, ?, ?, datetime('now')) RETURNING *`
    ).bind(url, name, is_active).first();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('Error creating background image', error as Error);
    return NextResponse.json({ error: 'Failed to create background image' }, { status: 500 });
  }
}
