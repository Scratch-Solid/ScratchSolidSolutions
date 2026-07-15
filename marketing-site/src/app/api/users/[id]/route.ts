export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withRateLimit, rateLimits } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many user requests. Please try again later.' },
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
    const { id } = await params;
    const userId = parseInt(id, 10);
    // validateSession() returns the raw sessions row (s.*) joined with the
    // user - `.id` on that object is the session row's own primary key, not
    // the user's id. `.user_id` is the actual FK to users(id) and must be
    // checked first, or this comparison almost never matches the real user.
    const requestingUserId = (user as any).user_id;
    const requestingUserRole = (user as any).role;

    if (requestingUserRole !== 'admin' && requestingUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userRecord = await db.prepare('SELECT id, email, role, name, phone, address, business_name FROM users WHERE id = ?').bind(id).first();
    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const response = NextResponse.json(userRecord);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching user', error as Error);
    const response = NextResponse.json({ error: `Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'business', 'client']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many user requests. Please try again later.' },
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
    const { id } = await params;
    const sessionRole: string = (user as any).role;
    const sessionId: number = (user as any).user_id;
    if (sessionRole !== 'admin' && sessionId !== parseInt(id)) {
      const response = NextResponse.json({ error: 'Forbidden: you can only delete your own account' }, { status: 403 });
      return withSecurityHeaders(response, traceId);
    }
    await db.prepare('UPDATE users SET deleted = 1 WHERE id = ?').bind(id).run();
    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error deleting user', error as Error);
    const response = NextResponse.json({ error: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
