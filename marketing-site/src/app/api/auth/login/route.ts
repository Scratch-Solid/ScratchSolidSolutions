export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createSession, deleteSession, validateLogin, validateLoginByPhone, isAccountLocked, isAccountLockedByPhone } from "@/lib/db";
import { sanitizeEmail, sanitizePhone } from "@/lib/sanitization";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logger } from "@/lib/logger";
import { generateAccessToken, generateRefreshToken, setAuthCookies } from "@/lib/session";
import { validateEmail } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
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
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const body = await request.json() as { email?: string; phone?: string; password?: string };
    const { email, phone, password } = body;

    if (!password || (!email && !phone)) {
      return NextResponse.json({ error: 'Please provide email or phone number and password' }, { status: 400 });
    }

    let user;

    if (email) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return NextResponse.json({ error: emailValidation.errors.join(', ') }, { status: 400 });
      }
      const sanitizedEmail = sanitizeEmail(email);
      if (await isAccountLocked(db, sanitizedEmail)) {
        return NextResponse.json({ error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.' }, { status: 423 });
      }
      user = await validateLogin(db, sanitizedEmail, password);
    } else if (phone) {
      const sanitizedPhone = sanitizePhone(phone);
      if (await isAccountLockedByPhone(db, sanitizedPhone)) {
        return NextResponse.json({ error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.' }, { status: 423 });
      }
      user = await validateLoginByPhone(db, sanitizedPhone, password);
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials. Please check your details and try again.' }, { status: 401 });
    }

    // Email verification gate removed: the verification flow is not yet fully
    // reliable (email deliverability, link handling). Users can log in immediately
    // after signup. Re-enable once the end-to-end verification flow is tested
    // and the Resend email delivery is verified for all user domains.

    // Generate JWT access token (Web Crypto API compatible for Cloudflare Workers)
    const token = await generateAccessToken((user as any).id, (user as any).email, (user as any).role);

    // Create DB-backed session for the access token
    await createSession(db, (user as any).id, token);

    // Issue a long-lived refresh token so clients can renew without re-login
    const refreshToken = await generateRefreshToken((user as any).id, crypto.randomUUID());

    const response = NextResponse.json({ 
      id: (user as any).id,
      email: (user as any).email,
      role: (user as any).role,
      name: (user as any).name,
      phone: (user as any).phone || '',
      address: (user as any).address || '',
      token: token,
      message: 'Login successful' 
    }, { status: 200 });

    // Set httpOnly cookies (secure) in addition to the body token (backward compat)
    setAuthCookies(response, token, refreshToken);

    return response;
  } catch (error) {
    logger.error('Error during login', error as Error);
    console.error('Login error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again.',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}
