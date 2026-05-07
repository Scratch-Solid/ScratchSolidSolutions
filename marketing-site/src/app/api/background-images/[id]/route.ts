import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  try {
    const image = await db.prepare('SELECT * FROM background_images WHERE id = ?').bind(parseInt(id)).first();
    if (!image) {
      return NextResponse.json({ error: 'Background image not found' }, { status: 404 });
    }
    return NextResponse.json(image);
  } catch (error) {
    logger.error('Error fetching background image', error as Error);
    return NextResponse.json({ error: 'Failed to fetch background image' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
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

    const image = await db.prepare('SELECT * FROM background_images WHERE id = ?').bind(parseInt(id)).first();
    if (!image) {
      return NextResponse.json({ error: 'Background image not found' }, { status: 404 });
    }

    const fields = Object.keys(body).filter(k => k !== 'id');
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => body[f as keyof typeof body]), parseInt(id)];

    const result = await db.prepare(
      `UPDATE background_images SET ${setClause} WHERE id = ? RETURNING *`
    ).bind(...values).first();

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating background image', error as Error);
    return NextResponse.json({ error: 'Failed to update background image' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  try {
    await db.prepare('DELETE FROM background_images WHERE id = ?').bind(parseInt(id)).run();
    return NextResponse.json({ message: 'Background image deleted' });
  } catch (error) {
    logger.error('Error deleting background image', error as Error);
    return NextResponse.json({ error: 'Failed to delete background image' }, { status: 500 });
  }
}
