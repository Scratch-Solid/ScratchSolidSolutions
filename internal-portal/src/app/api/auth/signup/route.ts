import { NextRequest, NextResponse } from 'next/server';
import { getDb, createUser, getUserByEmail } from '../../../../lib/db';
import { sanitizeEmail, sanitizeString, sanitizePhone } from '../../../../lib/sanitization';
import { withRateLimit, withTracing, withSecurityHeaders, logRequest, getClientIP } from '../../../../lib/middleware';
import { sanitizeRequestBody } from '../../../../lib/sanitization';
import { logAuthFailure } from '../../../../lib/security-logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

// Warn if JWT_SECRET is not set or is too weak
if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET) {
    console.error('CRITICAL SECURITY WARNING: JWT_SECRET environment variable is not set in production');
  } else if (JWT_SECRET.length < 32) {
    console.error('CRITICAL SECURITY WARNING: JWT_SECRET is too short (min 32 characters recommended)');
  }
}

function getJWTSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  return JWT_SECRET;
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const body = await request.json() as { 
      email?: string; 
      password?: string; 
      name?: string; 
      phone?: string; 
      role?: string;
    };
    
    const { email: rawEmail, password, name, phone: rawPhone, role } = body;

    if (!rawEmail || !password || !name) {
      logAuthFailure('Missing required fields', { ip: getClientIP(request) });
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    const email = sanitizeEmail(rawEmail);
    const phone = rawPhone ? sanitizePhone(rawPhone) : '';

    // Check if user already exists
    const existingUser = await getUserByEmail(db, email);
    if (existingUser) {
      logAuthFailure('User already exists', { email, ip: getClientIP(request) });
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create new user (default role is 'staff' unless specified)
    const userRole = role === 'admin' ? 'admin' : 'staff';

    const newUser = await createUser(db, {
      email,
      password_hash: passwordHash,
      role: userRole,
      name: sanitizeString(name),
      phone,
      address: '',
      business_name: ''
    });

    if (!newUser) {
      logAuthFailure('Failed to create user', { email, ip: getClientIP(request) });
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Log successful user creation
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'USER_CREATED',
      email,
      role: userRole,
      name: sanitizeString(name),
      ip: getClientIP(request)
    }));

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: (newUser as any).id,
        email: (newUser as any).email,
        name: (newUser as any).name,
        role: (newUser as any).role,
        phone: (newUser as any).phone
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
