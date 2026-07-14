export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserById, createSession } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  REFRESH_COOKIE_NAME,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "@/lib/session";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import crypto from 'crypto';

/**
 * Exchanges a valid refresh-token cookie for a fresh access token (and a
 * rotated refresh token). Returns the access token in the body for clients
 * that store it for Bearer-based requests.
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many refresh attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Service temporarily unavailable. Please try again later.' }, { status: 503 });
  }

  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      const res = NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
      return clearAuthCookies(res);
    }

    const user = await getUserById(db, payload.id) as
      | { id: number; email: string; role: string; deleted?: number }
      | null;
    if (!user || (user as any).deleted === 1) {
      const res = NextResponse.json({ error: 'Account no longer active' }, { status: 401 });
      return clearAuthCookies(res);
    }

    // Issue a new access token and persist it as a DB-backed session.
    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    await createSession(db, user.id, accessToken);

    // Rotate the refresh token.
    const newRefreshToken = await generateRefreshToken(user.id, crypto.randomUUID());

    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      token: accessToken,
      message: 'Token refreshed',
    }, { status: 200 });

    setAuthCookies(response, accessToken, newRefreshToken);
    return response;
  } catch (error) {
    logger.error('Error during token refresh', error as Error);
    return NextResponse.json({ error: `Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
