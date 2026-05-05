import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withRateLimit, rateLimits } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const event = await db.prepare('SELECT * FROM business_events WHERE id = ?').bind(parseInt(params.id)).first();
    if (!event) {
      return NextResponse.json({ error: 'Business event not found' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error) {
    logger.error('Error fetching business event', error as Error);
    return NextResponse.json({ error: 'Failed to fetch business event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      status?: string;
      event_type?: string;
      requested_date?: string;
      special_instructions?: string;
    };

    const event = await db.prepare('SELECT * FROM business_events WHERE id = ?').bind(parseInt(params.id)).first();
    if (!event) {
      return NextResponse.json({ error: 'Business event not found' }, { status: 404 });
    }

    const fields = Object.keys(body).filter(k => k !== 'id');
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => body[f as keyof typeof body]), parseInt(params.id)];

    const result = await db.prepare(
      `UPDATE business_events SET ${setClause}, updated_at = datetime('now') WHERE id = ? RETURNING *`
    ).bind(...values).first();

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating business event', error as Error);
    return NextResponse.json({ error: 'Failed to update business event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    await db.prepare('DELETE FROM business_events WHERE id = ?').bind(parseInt(params.id)).run();
    return NextResponse.json({ message: 'Business event deleted' });
  } catch (error) {
    logger.error('Error deleting business event', error as Error);
    return NextResponse.json({ error: 'Failed to delete business event' }, { status: 500 });
  }
}
