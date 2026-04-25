import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many cleaner requests. Please try again later.' },
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

  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'idle';
    const blocked = searchParams.get('blocked') || '0';

    const query = `
      SELECT cp.user_id, cp.username, cp.paysheet_code, cp.first_name, cp.last_name,
             cp.profile_picture, cp.specialties, cp.rating, cp.status, cp.blocked,
             cp.weekday_rate, cp.weekend_rate
      FROM cleaner_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.status = ? AND cp.blocked = ? AND u.deleted = 0
      ORDER BY cp.rating DESC
    `;

    const cleaners = await db.prepare(query).bind(status, blocked).all();

    const response = NextResponse.json(cleaners.results || []);
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300, s-maxage=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching cleaners', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch cleaners' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
