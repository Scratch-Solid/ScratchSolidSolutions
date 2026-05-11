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
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let result;
    if (category) {
      result = await db.prepare('SELECT * FROM ai_responses WHERE category = ? ORDER BY created_at DESC').bind(category).all();
    } else {
      result = await db.prepare('SELECT * FROM ai_responses ORDER BY created_at DESC').all();
    }

    return NextResponse.json(result.results || []);
  } catch (error) {
    logger.error('Error fetching AI responses', error as Error);
    return NextResponse.json({ error: 'Failed to fetch AI responses' }, { status: 500 });
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
      question?: string;
      response?: string;
      category?: string;
    };

    const { question, response, category } = body;

    if (!question || !response) {
      return NextResponse.json({ error: 'Missing required fields: question, response' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO ai_responses (question, response, category, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now')) RETURNING *`
    ).bind(question, response, category || '').first();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('Error creating AI response', error as Error);
    return NextResponse.json({ error: 'Failed to create AI response' }, { status: 500 });
  }
}
