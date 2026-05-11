export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }
  const { id } = await params;

  try {
    const pricing = await db.prepare('SELECT * FROM pricing WHERE id = ?').bind(parseInt(id)).first();
    if (!pricing) {
      return NextResponse.json({ error: 'Pricing not found' }, { status: 404 });
    }
    const response = NextResponse.json(pricing);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching pricing', error as Error);
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
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
      service_type?: string;
      rate?: number;
      duration?: string;
    };

    const pricing = await db.prepare('SELECT * FROM pricing WHERE id = ?').bind(parseInt(id)).first();
    if (!pricing) {
      return NextResponse.json({ error: 'Pricing not found' }, { status: 404 });
    }

    const fields = Object.keys(body).filter(k => k !== 'id');
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => body[f as keyof typeof body]), parseInt(id)];

    const result = await db.prepare(
      `UPDATE pricing SET ${setClause} WHERE id = ? RETURNING *`
    ).bind(...values).first();

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating pricing', error as Error);
    return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  try {
    await db.prepare('DELETE FROM pricing WHERE id = ?').bind(parseInt(id)).run();
    return NextResponse.json({ message: 'Pricing deleted' });
  } catch (error) {
    logger.error('Error deleting pricing', error as Error);
    return NextResponse.json({ error: 'Failed to delete pricing' }, { status: 500 });
  }
}
