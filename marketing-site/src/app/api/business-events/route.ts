export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimits } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many business event requests. Please try again later.' },
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
    const { searchParams } = new URL(request.url);
    const queryBusinessId = searchParams.get('business_id');
    const sessionRole: string = (user as any).role;
    // validateSession() returns the raw sessions row (s.*) - `.id` there is
    // the session row's own primary key, not the user's id.
    const sessionId: number = (user as any).user_id;
    let results;

    if (sessionRole === 'admin') {
      if (queryBusinessId) {
        results = await db.prepare(
          'SELECT * FROM business_events WHERE business_id = ? ORDER BY created_at DESC'
        ).bind(queryBusinessId).all();
      } else {
        results = await db.prepare(
          'SELECT * FROM business_events ORDER BY created_at DESC LIMIT 100'
        ).all();
      }
    } else {
      results = await db.prepare(
        'SELECT * FROM business_events WHERE business_id = ? ORDER BY created_at DESC'
      ).bind(sessionId.toString()).all();
    }
    const response = NextResponse.json(results.results || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching business events', error as Error);
    const response = NextResponse.json({ error: `Failed to fetch business events: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many business event requests. Please try again later.' },
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
    const body = await request.json() as {
      business_id?: number;
      event_type?: string;
      requested_date?: string;
      special_instructions?: string;
    };
    const { business_id, event_type, requested_date, special_instructions } = body;
    const sessionRole: string = (user as any).role;
    const effectiveBusinessId = sessionRole === 'admin' && business_id ? business_id : (user as any).user_id;

    if (!effectiveBusinessId || !event_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await db.prepare(
      'INSERT INTO business_events (business_id, event_type, requested_date, special_instructions, created_at) VALUES (?, ?, ?, ?, datetime("now")) RETURNING *'
    ).bind(effectiveBusinessId, event_type, requested_date || '', special_instructions || '').first();
    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating business event', error as Error);
    const response = NextResponse.json({ error: `Failed to create business event: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
