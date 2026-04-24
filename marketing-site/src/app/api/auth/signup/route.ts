import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createUser, createSession, sanitizeEmail, sanitizeString, sanitizePhone } from "@/lib/db";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from "@/lib/logger";
import { getJWTSecret } from "@/lib/env";

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
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const body = await request.json() as {
      type?: string;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      businessName?: string;
      registration?: string;
      password?: string;
      role?: string;
      business_info?: string;
    };
    const { type, name, email, phone, address, businessName, registration, password, role, business_info } = body;

    const rawName = name;
    const rawEmail = email;
    const rawPhone = phone;
    const rawAddress = address;

    const sanitizedName = sanitizeString(rawName || '');
    const sanitizedEmail = sanitizeEmail(rawEmail || '');
    const sanitizedPhone = sanitizePhone(rawPhone || '');
    const sanitizedAddress = sanitizeString(rawAddress || '');

    // Validate required fields
    if (!type || !sanitizedName || !sanitizedEmail || !password) {
      return NextResponse.json({ error: 'Please fill in all required fields (name, email, and password)' }, { status: 400 });
    }

    // Email is now required for all accounts
    if (!sanitizedEmail) {
      return NextResponse.json({ error: 'Email is required for all accounts' }, { status: 400 });
    }

    if (!validateEmailFormat(sanitizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const pwdCheck = validatePasswordPolicy(password);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: 'Password does not meet requirements', details: pwdCheck.errors }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(db, sanitizedEmail);
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists. Please login or use a different email.' }, { status: 409 });
    }

    // Handle business signup
    if (type === 'business') {
      if (!businessName) {
        return NextResponse.json({ error: 'Business name is required for business signup' }, { status: 400 });
      }

      const user = await createUser(db, {
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        address: sanitizedAddress,
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
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      address: sanitizedAddress,
      password_hash: await bcrypt.hash(password, 10),
      role: role || 'client'
    });

    if (!user) {
      return NextResponse.json({ error: 'Unable to create account. Please try again or contact support.' }, { status: 500 });
    }

    const token = jwt.sign({ id: (user as any).id, email: (user as any).email, role: (user as any).role }, getJWTSecret(), { expiresIn: '30d' });
    await createSession(db, (user as any).id, token);

    return NextResponse.json({
      id: (user as any).id,
      email: (user as any).email,
      role: (user as any).role,
      token: token,
      message: 'Account created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating user', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred during signup. Please try again.' }, { status: 500 });
  }
}
