/**
 * Session Management with httpOnly Cookies
 * Secure session management using httpOnly cookies instead of localStorage
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

import { getCloudflareContext } from './runtime-context';

async function getCloudflareSecret(name: string): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    return (env as any)?.[name] || process.env[name];
  } catch {
    return process.env[name];
  }
}

async function getJwtSecret(): Promise<string> {
  const secret = await getCloudflareSecret('JWT_SECRET');
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
export async function generateAccessToken(userId: number, email: string, role: string): Promise<string> {
  return await new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(await getJwtSecret()));
}

/**
 * Generate refresh token (long-lived)
 */
export async function generateRefreshToken(userId: number, tokenId: string): Promise<string> {
  return await new SignJWT({ userId, tokenId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(await getJwtSecret()));
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

    const { payload } = await jwtVerify(token, new TextEncoder().encode(await getJwtSecret()));
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify access token
 */
export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(await getJwtSecret()));
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(await getJwtSecret()));
    return payload as unknown as RefreshTokenPayload;
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

    const payload = await verifyRefreshToken(refreshToken);
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

    const accessToken = await generateAccessToken(user.id, user.email, user.role);
    return { accessToken };
  } catch (error) {
    return null;
  }
}
