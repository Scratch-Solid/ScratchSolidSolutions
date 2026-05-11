export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, recordTaskCompletion, getCleanerEarnings } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleaner_id');

    if (cleanerId) {
      const earnings = await getCleanerEarnings(db, parseInt(cleanerId));
      return NextResponse.json(earnings);
    }

    // Get all task completions (admin only)
    if ((authResult as any).user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await db.prepare('SELECT * FROM task_completions ORDER BY completed_at DESC').all();
    return NextResponse.json(result.results || []);
  } catch (error) {
    logger.error('Error fetching task completions', error as Error);
    return NextResponse.json({ error: 'Failed to fetch task completions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner']);
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
      booking_id?: number;
      cleaner_id?: number;
      earnings?: number;
    };

    const { booking_id, cleaner_id, earnings = 150 } = body;

    if (!booking_id || !cleaner_id) {
      return NextResponse.json({ error: 'Missing required fields: booking_id, cleaner_id' }, { status: 400 });
    }

    const completion = await recordTaskCompletion(db, booking_id, cleaner_id, earnings);
    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    logger.error('Error recording task completion', error as Error);
    return NextResponse.json({ error: 'Failed to record task completion' }, { status: 500 });
  }
}
