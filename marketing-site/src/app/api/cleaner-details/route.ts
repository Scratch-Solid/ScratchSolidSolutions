export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimits } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many cleaner detail requests. Please try again later.' },
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
    const username = searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'username parameter required' }, { status: 400 });
    }
    const cleaner = await db.prepare(
      `SELECT cp.username, cp.paysheet_code, u.name, u.phone, u.address,
              cp.profile_picture, cp.specialties, cp.rating, cp.bio
       FROM cleaner_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.username = ? AND cp.blocked = 0`
    ).bind(username).first();
    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
    }
    const response = NextResponse.json(cleaner);
    response.headers.set('Cache-Control', 'public, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching cleaner details', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch cleaner details' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
