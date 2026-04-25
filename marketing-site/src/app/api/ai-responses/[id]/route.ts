import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const response = await db.prepare('SELECT * FROM ai_responses WHERE id = ?').bind(parseInt(params.id)).first();
    if (!response) {
      return NextResponse.json({ error: 'AI response not found' }, { status: 404 });
    }
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching AI response', error as Error);
    return NextResponse.json({ error: 'Failed to fetch AI response' }, { status: 500 });
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
      question?: string;
      response?: string;
      category?: string;
    };

    const { question, response, category } = body;

    if (!question || !response) {
      return NextResponse.json({ error: 'Missing required fields: question, response' }, { status: 400 });
    }

    const result = await db.prepare(
      `UPDATE ai_responses SET question = ?, response = ?, category = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
    ).bind(question, response, category || '', parseInt(params.id)).first();

    if (!result) {
      return NextResponse.json({ error: 'AI response not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating AI response', error as Error);
    return NextResponse.json({ error: 'Failed to update AI response' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    await db.prepare('DELETE FROM ai_responses WHERE id = ?').bind(parseInt(params.id)).run();
    return NextResponse.json({ message: 'AI response deleted' });
  } catch (error) {
    logger.error('Error deleting AI response', error as Error);
    return NextResponse.json({ error: 'Failed to delete AI response' }, { status: 500 });
  }
}
