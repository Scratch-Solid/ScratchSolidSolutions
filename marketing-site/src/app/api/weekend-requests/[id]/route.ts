import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withRateLimit, rateLimits } from '@/lib/middleware';
import { logger } from '@/lib/logger';

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
      assigned_cleaner_id?: number;
      assigned_cleaner_name?: string;
    };

    const fields = Object.keys(body).filter(k => k !== 'id');
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => body[f as keyof typeof body]), parseInt(params.id)];

    const result = await db.prepare(
      `UPDATE weekend_requests SET ${setClause}, updated_at = datetime('now') WHERE id = ? RETURNING *`
    ).bind(...values).first();

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating weekend request', error as Error);
    return NextResponse.json({ error: 'Failed to update weekend request' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many weekend request actions. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const id = params.id;
    await db.prepare(
      'UPDATE weekend_requests SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind('cancelled', id).run();
    const response = NextResponse.json({ message: 'Weekend request cancelled' });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error cancelling weekend request', error as Error);
    const response = NextResponse.json({ error: 'Failed to cancel weekend request' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
