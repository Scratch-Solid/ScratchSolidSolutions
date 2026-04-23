import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createUser, createSession, sanitizeEmail, sanitizeString, sanitizePhone } from "@/lib/db";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

function getJWTSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  return JWT_SECRET;
}

function validatePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character');
  return { valid: errors.length === 0, errors };
}

function validateEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { type, name: rawName, email: rawEmail, phone: rawPhone, address: rawAddress, businessName, registration, password, role, business_info } = body;

    const name = sanitizeString(rawName);
    const email = sanitizeEmail(rawEmail);
    const phone = sanitizePhone(rawPhone || '');
    const address = sanitizeString(rawAddress || '');

    // Validate required fields
    if (!type || !name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!validateEmailFormat(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const pwdCheck = validatePasswordPolicy(password);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: 'Password policy violation', details: pwdCheck.errors }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(db, email);
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Handle business signup
    if (type === 'business') {
      if (!businessName) {
        return NextResponse.json({ error: 'Business name is required for business signup' }, { status: 400 });
      }

      const user = await createUser(db, {
        name,
        email,
        phone,
        address,
        business_name: businessName,
        business_registration: registration,
        password_hash: await bcrypt.hash(password, 10),
        role: role || 'business'
      });

      if (!user) {
        return NextResponse.json({ error: 'Failed to create business account' }, { status: 500 });
      }

      const token = jwt.sign({ id: (user as any).id, email: (user as any).email, role: (user as any).role }, getJWTSecret(), { expiresIn: '24h' });
      await createSession(db, (user as any).id, token);
      
      return NextResponse.json({ 
        id: (user as any).id, 
        email: (user as any).email,
        role: (user as any).role,
        token: token,
        message: 'Business account created successfully' 
      }, { status: 201 });
    }

    // Handle individual signup
    const user = await createUser(db, {
      name,
      email,
      phone,
      address,
      password_hash: await bcrypt.hash(password, 10),
      role: role || 'client'
    });

    if (!user) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const token = jwt.sign({ id: (user as any).id, email: (user as any).email, role: (user as any).role }, JWT_SECRET, { expiresIn: '30d' });
    await createSession(db, (user as any).id, token);

    return NextResponse.json({ 
      id: (user as any).id, 
      email: (user as any).email,
      role: (user as any).role,
      token: token,
      message: 'Account created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
