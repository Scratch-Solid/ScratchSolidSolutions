import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createSession, deleteSession, validateLogin, isAccountLocked, sanitizeEmail } from "@/lib/db";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from "@/lib/logger";
import { getJWTSecret } from "@/lib/env";
import { validateEmail, validatePassword } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const body = await request.json() as { email?: string; password?: string };
    const { email, password } = body;

    // Validate email and password
    const emailValidation = validateEmail(email || '');
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.errors.join(', ') }, { status: 400 });
    }

    const passwordValidation = validatePassword(password || '');
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.errors.join(', ') }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Please enter your email and password' }, { status: 400 });
    }

    const rawEmail = email;
    const sanitizedEmail = sanitizeEmail(rawEmail);

    // Check account lockout
    if (await isAccountLocked(db, sanitizedEmail)) {
      return NextResponse.json({ error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.' }, { status: 423 });
    }

    // Authenticate user against database (includes lockout tracking)
    const user = await validateLogin(db, sanitizedEmail, password);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password. Please check your credentials and try again.' }, { status: 401 });
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
      token: token,
      message: 'Login successful' 
    }, { status: 200 });
  } catch (error) {
    logger.error('Error during login', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
