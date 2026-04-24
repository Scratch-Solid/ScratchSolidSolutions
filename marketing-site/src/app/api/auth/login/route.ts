import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createSession, deleteSession, validateLogin, isAccountLocked, sanitizeEmail } from "@/lib/db";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

function getJWTSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  return JWT_SECRET;
}

export async function POST(request: NextRequest) {
  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { email: rawEmail, password } = body;

    // Validate required fields
    if (!rawEmail || !password) {
      return NextResponse.json({ error: 'Please enter your email and password' }, { status: 400 });
    }

    const email = sanitizeEmail(rawEmail);

    // Check account lockout
    if (await isAccountLocked(db, email)) {
      return NextResponse.json({ error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.' }, { status: 423 });
    }

    // Authenticate user against database (includes lockout tracking)
    const user = await validateLogin(db, email, password);

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
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
