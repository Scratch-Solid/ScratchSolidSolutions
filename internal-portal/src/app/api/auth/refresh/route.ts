import { NextRequest, NextResponse } from 'next/server';
import { getDb, createRefreshToken, validateRefreshToken, revokeRefreshToken, createSession, deleteSession } from '@/lib/db';
import { withSecurityHeaders, withTracing, withRateLimit } from '@/lib/middleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) {
    const response = NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    return withSecurityHeaders(response, traceId);
  }

  if (!JWT_SECRET) {
    const response = NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }

  try {
    const body = await request.json() as { refreshToken?: string };
    const { refreshToken } = body;

    if (!refreshToken) {
      const response = NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate refresh token
    const tokenData = await validateRefreshToken(db, refreshToken);
    if (!tokenData) {
      const response = NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
      return withSecurityHeaders(response, traceId);
    }

    // Revoke old refresh token
    await revokeRefreshToken(db, refreshToken);

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: (tokenData as any).user_id, email: (tokenData as any).email, role: (tokenData as any).role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Generate new refresh token
    const newRefreshToken = await createRefreshToken(db, (tokenData as any).user_id);

    // Delete old session and create new one
    await deleteSession(db, refreshToken);
    await createSession(db, (tokenData as any).user_id, newAccessToken, newRefreshToken);

    const response = NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600 // 1 hour
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Refresh token error:', error);
    const response = NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
