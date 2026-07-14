export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import {
  verifyRefreshToken,
  verifyPassword,
  hashPassword,
  logAuthEvent,
  getUserPermissions,
  isSuperuser,
} from '@/lib/auth';
import { setAuthCookies, generateAccessToken, verifyRefreshToken as verifySessionRefreshToken, generateRefreshToken as generateSessionRefreshToken } from '@/lib/session';
import { applySecurityMiddleware } from '@/lib/security-middleware';

/**
 * Refresh Token Endpoint
 * 
 * Allows users to refresh their access token using a valid refresh token.
 * This implements secure session management with token rotation.
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    // Get refresh token from httpOnly cookie
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: 'Refresh token is required'
      }, { status: 400 });
    }

    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Verify refresh token using session library
    const decoded = await verifySessionRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired refresh token'
      }, { status: 401 });
    }

    // Check if refresh token exists and is not revoked
    const tokenRecord = await db.prepare(
      'SELECT * FROM refresh_tokens WHERE token_id = ? AND revoked_at IS NULL AND expires_at > ?'
    ).bind(decoded.tokenId, Math.floor(Date.now() / 1000)).first();

    if (!tokenRecord) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired refresh token'
      }, { status: 401 });
    }

    // Get user details
    const userResult = await db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(decoded.userId).first();

    if (!userResult) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Revoke old refresh token (token rotation)
    await db.prepare(
      'UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?'
    ).bind(Math.floor(Date.now() / 1000), tokenRecord.id).run();

    // Generate new tokens
    const userId = userResult.id as number;
    const userEmail = userResult.email as string;
    const userRole = userResult.role as string;
    const newAccessToken = await generateAccessToken(userId, userEmail, userRole);
    const newRefreshTokenId = crypto.randomUUID();
    const newRefreshToken = await generateSessionRefreshToken(userId, newRefreshTokenId);
    const newRefreshTokenHash = await hashPassword(newRefreshToken);

    // Store new refresh token
    await db.prepare(
      `INSERT INTO refresh_tokens (user_id, token_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      userResult.id,
      newRefreshTokenId,
      newRefreshTokenHash,
      Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      ip,
      userAgent
    ).run();

    // Get user permissions
    const permissions = await getUserPermissions(db, userId as number);
    const superuser = await isSuperuser(db, userId as number);

    const response = NextResponse.json({
      success: true,
      user: {
        id: userResult.id,
        email: userResult.email,
        name: userResult.name,
        role: userResult.role,
        is_superuser: superuser,
        permissions,
      }
    });

    // Set new httpOnly cookies
    setAuthCookies(response, newAccessToken, newRefreshToken);
    applySecurityMiddleware(response);

    return response;
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
