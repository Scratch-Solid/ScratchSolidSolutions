export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { withTracing, withSecurityHeaders, withRateLimit } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  
  // Rate limiting
  const rl = await withRateLimit(request);
  if (rl) return withSecurityHeaders(rl, traceId);

  try {
    const body = await request.json() as { 
      name?: string; 
      email?: string; 
      password?: string; 
      role?: string; 
      phone?: string; 
      paysheetCode?: string;
      department?: string;
    };

    const { name, email, password, role, phone, paysheetCode, department } = body;

    if (!name || !email || !password) {
      return withSecurityHeaders(NextResponse.json(
        { error: 'Name, email, and password required' },
        { status: 400 }
      ), traceId);
    }

    const db = await getDb();
    if (!db) {
      return withSecurityHeaders(NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      ), traceId);
    }

    // Check if user already exists
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return withSecurityHeaders(NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      ), traceId);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user with paysheet_code and department
    const result = await db.prepare(
      `INSERT INTO users (name, email, password_hash, role, phone, paysheet_code, department, created_at, password_needs_reset) 
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)`
    ).bind(name, email, passwordHash, role || 'cleaner', phone || '', paysheetCode || '', department || '').run();

    const userId = result.meta.last_row_id;

    // Generate session token
    const sessionToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    await db.prepare(
      `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`
    ).bind(userId, sessionToken).run();

    return withSecurityHeaders(NextResponse.json({
      success: true,
      id: userId,
      token: sessionToken,
      message: 'User registered successfully'
    }), traceId);

  } catch (error) {
    console.error('Register error:', error);
    return withSecurityHeaders(NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    ), traceId);
  }
}
