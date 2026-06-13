export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, deleteSession } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ACCESS_COOKIE_NAME, clearAuthCookies } from "@/lib/session";
import { withRateLimit, rateLimits, withCsrf } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return csrfResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many logout attempts. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        }
      }
    );
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  try {
    // Accept the access token from the Authorization header or the auth cookie.
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : request.cookies.get(ACCESS_COOKIE_NAME)?.value;

    // Best-effort revoke the DB-backed session, then always clear cookies.
    if (token) {
      try {
        await deleteSession(db, token);
      } catch {
        // Ignore: logout should succeed even if the session row is already gone.
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    return clearAuthCookies(response);
  } catch (error) {
    logger.error('Error during logout', error as Error);
    const response = NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    return clearAuthCookies(response);
  }
}
