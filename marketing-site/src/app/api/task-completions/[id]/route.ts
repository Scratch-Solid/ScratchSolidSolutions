import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const completion = await db.prepare('SELECT * FROM task_completions WHERE id = ?').bind(parseInt(params.id)).first();
    if (!completion) {
      return NextResponse.json({ error: 'Task completion not found' }, { status: 404 });
    }
    return NextResponse.json(completion);
  } catch (error) {
    logger.error('Error fetching task completion', error as Error);
    return NextResponse.json({ error: 'Failed to fetch task completion' }, { status: 500 });
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
      earnings?: number;
    };

    const result = await db.prepare(
      `UPDATE task_completions SET earnings = ? WHERE id = ? RETURNING *`
    ).bind(body.earnings || 150, parseInt(params.id)).first();

    if (!result) {
      return NextResponse.json({ error: 'Task completion not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating task completion', error as Error);
    return NextResponse.json({ error: 'Failed to update task completion' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    await db.prepare('DELETE FROM task_completions WHERE id = ?').bind(parseInt(params.id)).run();
    return NextResponse.json({ message: 'Task completion deleted' });
  } catch (error) {
    logger.error('Error deleting task completion', error as Error);
    return NextResponse.json({ error: 'Failed to delete task completion' }, { status: 500 });
  }
}
