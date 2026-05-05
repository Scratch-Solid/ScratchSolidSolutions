import { NextRequest, NextResponse } from 'next/server';
import { getDb, createUser } from '@/lib/db';
import { withTracing, withSecurityHeaders, logRequest, withRateLimit } from '@/lib/middleware';
import { sanitizeRequestBody } from '@/lib/sanitization';
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

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = withTracing(request);
  const start = Date.now();

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const body = await request.json();

    // Sanitize input
    const { sanitized, error } = sanitizeRequestBody(body, {
      required: ['email', 'password'],
      optional: ['fullName', 'name', 'role', 'phone', 'department', 'paysheetCode'],
      emailFields: ['email'],
      phoneFields: ['phone'],
      idFields: ['paysheetCode']
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const { fullName, name, email, password, role, phone, department, paysheetCode } = sanitized;

    // Map fullName to name for compatibility
    const userName = name || fullName;

    if (!userName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Map department to role if not provided
    const userRole = role || (department === 'Scratch' ? 'cleaner' : department === 'Solid' ? 'digital' : department === 'Trans' ? 'transport' : 'cleaner');

    const pwdCheck = validatePasswordPolicy(password);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: 'Password policy violation', details: pwdCheck.errors }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password with bcrypt
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser(db, {
      email,
      password_hash,
      role: userRole,
      name: userName,
      phone: phone || '',
    });

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create cleaner profile for staff roles
    if (['cleaner', 'digital', 'transport'].includes(userRole)) {
      const username = paysheetCode || `${department || 'Scratch'}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await db.prepare(
        `INSERT INTO cleaner_profiles (user_id, username, paysheet_code, department, status)
         VALUES (?, ?, ?, ?, 'idle')`
      ).bind((user as any).id, username, paysheetCode || username, department || 'cleaning').run();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: (user as any).id, role: userRole, email },
      getJWTSecret(),
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({
      token,
      user: {
        id: (user as any).id,
        email,
        role,
        name,
      },
    }, { status: 201 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
