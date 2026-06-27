/**
 * Client session management for the marketing site.
 *
 * The marketing site uses DB-backed sessions (the `sessions` table validated by
 * `validateSession`) for the access token, PLUS a long-lived refresh token so
 * clients can obtain a fresh access token without re-authenticating.
 *
 * Tokens are issued both as httpOnly cookies (secure default) and returned in
 * the response body for backward compatibility with existing Bearer-token
 * clients that store the token in localStorage.
 */

import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { getJWTSecret } from './env';

export const ACCESS_COOKIE_NAME = 'client_auth_token';
export const REFRESH_COOKIE_NAME = 'client_refresh_token';

// Access token lifetime matches the DB session lifetime (createSession = +7 days).
const ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60;
// Refresh token is longer-lived so clients can renew silently.
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface AccessTokenPayload {
  id: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: number;
  tokenId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

/** Generate a DB-backed access token (same payload shape the app already uses). */
export async function generateAccessToken(id: number, email: string, role: string): Promise<string> {
  return await new SignJWT({ id, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(await getJWTSecret()));
}

/** Generate a long-lived refresh token. */
export async function generateRefreshToken(id: number, tokenId: string): Promise<string> {
  return await new SignJWT({ id, tokenId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(await getJWTSecret()));
}

/** Verify a refresh token; returns null if invalid/expired/not a refresh token. */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(await getJWTSecret()));
    if (payload?.type !== 'refresh') return null;
    return payload as unknown as RefreshTokenPayload;
  } catch {
    return null;
  }
}

/** Set httpOnly access + refresh cookies on the response. */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL_SECONDS,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TTL_SECONDS,
  });
  return response;
}

/** Clear the auth cookies (logout). */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete(ACCESS_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
}
