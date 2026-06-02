/**
 * Session Management with httpOnly Cookies
 * Secure session management using httpOnly cookies instead of localStorage
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

import { getEnvVar } from './env';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}
const COOKIE_NAME = 'auth_token';
const REFRESH_COOKIE_NAME = 'refresh_token';

export interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(userId: number, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    getJwtSecret(),
    { expiresIn: '15m' } // 15 minutes
  );
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(userId: number, tokenId: string): string {
  return jwt.sign(
    { userId, tokenId },
    getJwtSecret(),
    { expiresIn: '7d' } // 7 days
  );
}

/**
 * Set auth cookies on response
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Set access token cookie (httpOnly, secure, sameSite)
  response.cookies.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  // Set refresh token cookie (httpOnly, secure, sameSite)
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
}

/**
 * Get session from cookies (server-side)
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = jwt.verify(token, getJwtSecret()) as SessionPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as SessionPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as RefreshTokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<{ accessToken: string } | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
      return null;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    // In production, you would:
    // 1. Check if the refresh token exists in the database
    // 2. Check if it's revoked
    // 3. Generate a new refresh token (token rotation)
    // 4. Update the database

    // For now, just generate a new access token
    // We need to fetch user details from database
    const { getDb } = await import('./db');
    const db = await getDb();
    if (!db) {
      return null;
    }

    const user = await db.prepare(
      'SELECT id, email, role FROM users WHERE id = ?'
    ).bind(payload.userId).first() as { id: number; email: string; role: string } | null;

    if (!user) {
      return null;
    }

    const accessToken = generateAccessToken(user.id, user.email, user.role);
    return { accessToken };
  } catch (error) {
    return null;
  }
}
