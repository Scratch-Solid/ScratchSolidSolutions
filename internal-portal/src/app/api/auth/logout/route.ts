export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAccessToken, logAuthEvent } from '@/lib/auth';
import { clearAuthCookies } from '@/lib/session';

/**
 * Logout Endpoint
 * 
 * Revokes all refresh tokens for the user and logs the logout event.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header required'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 });
    }

    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    // Revoke all refresh tokens for this user
    await db.prepare(
      'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL'
    ).bind(Math.floor(Date.now() / 1000), decoded.userId).run();

    // Log logout event
    await logAuthEvent(db, decoded.userId, 'logout', ip, userAgent);

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
