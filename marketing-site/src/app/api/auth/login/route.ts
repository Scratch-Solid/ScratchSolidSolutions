import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createSession, deleteSession, validateLogin, validateLoginByPhone, isAccountLocked, isAccountLockedByPhone, sanitizeEmail, sanitizePhone } from "@/lib/db";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from "@/lib/logger";
import { getJWTSecret } from "@/lib/env";
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

    // Generate JWT token
    const token = jwt.sign({ id: (user as any).id, email: (user as any).email, role: (user as any).role }, getJWTSecret(), { expiresIn: '24h' });

    // Create session
    await createSession(db, (user as any).id, token);

    return NextResponse.json({ 
      id: (user as any).id,
      email: (user as any).email,
      role: (user as any).role,
      name: (user as any).name,
      phone: (user as any).phone || '',
      address: (user as any).address || '',
      token: token,
      message: 'Login successful' 
    }, { status: 200 });
  } catch (error) {
    logger.error('Error during login', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
