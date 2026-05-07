import { NextRequest, NextResponse } from 'next/server';
import { getDb, validateLogin, isAccountLocked, sanitizeEmail, sanitizeString, sanitizePhone } from '../../../../lib/db';
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
    const body = await request.json() as { username?: string; password?: string };
    const { username: rawUsername, password } = body;

    if (!rawUsername || !password) {
      logAuthFailure('Missing credentials', { ip: getClientIP(request) });
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const username = rawUsername.includes('@') ? sanitizeEmail(rawUsername) : sanitizeString(rawUsername);

    // Check if username is email (admin) or paysheet code (cleaner)
    const isAdmin = rawUsername.includes('@');

    if (isAdmin) {
      // Admin login
      if (await isAccountLocked(db, username)) {
        return NextResponse.json({ error: 'Account temporarily locked. Try again later.' }, { status: 423 });
      }
      const user = await validateLogin(db, username, password);
      if (!user) {
        logAuthFailure('Invalid credentials', { username, ip: getClientIP(request) });
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const token = jwt.sign(
        { userId: (user as any).id, role: (user as any).role, email: (user as any).email },
        getJWTSecret(),
        { expiresIn: '24h' }
      );

      // Create session in database
      await db.prepare(
        `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+24 hours'))`
      ).bind((user as any).id, token).run();

      // Log successful admin login
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'AUTH_SUCCESS',
        username,
        role: (user as any).role,
        ip: getClientIP(request)
      }));

      return NextResponse.json({
        token,
        role: (user as any).role,
        username: (user as any).email,
        user_id: (user as any).id,
        email: (user as any).email,
        name: (user as any).name
      });
    } else {
      // Cleaner login using paysheet code or phone number
      if (await isAccountLocked(db, username)) {
        return NextResponse.json({ error: 'Account temporarily locked. Try again later.' }, { status: 423 });
      }

      // Try paysheet code first
      let cleanerProfile = await db.prepare(
        'SELECT * FROM cleaner_profiles WHERE paysheet_code = ?'
      ).bind(username).first();

      // If not found, try phone number (for onboarding users)
      if (!cleanerProfile) {
        const userByPhone = await db.prepare('SELECT id, email, role, name, password_hash, failed_attempts, locked_until, phone FROM users WHERE phone = ?').bind(username).first();
        if (userByPhone) {
          cleanerProfile = await db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').bind((userByPhone as any).id).first();
        }
      }

      if (!cleanerProfile) {
        logAuthFailure('Invalid cleaner credentials', { username, ip: getClientIP(request) });
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Check if cleaner is blocked
      if ((cleanerProfile as any).blocked === 1) {
        return NextResponse.json({ error: 'Your account has been blocked. Please contact administration.' }, { status: 403 });
      }

      // Get user record
      const user = await db.prepare('SELECT id, email, role, name, password_hash, failed_attempts, locked_until FROM users WHERE id = ?').bind((cleanerProfile as any).user_id).first();
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isValidPassword = await bcrypt.compare(password, (user as any).password_hash);
      if (!isValidPassword) {
        await db.prepare(
          `UPDATE users SET failed_attempts = COALESCE(failed_attempts, 0) + 1, locked_until = CASE WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN datetime('now', '+15 minutes') ELSE locked_until END WHERE email = ?`
        ).bind((user as any).email).run();
        logAuthFailure('Invalid password', { username, ip: getClientIP(request) });
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      // Reset failed attempts on success
      await db.prepare(
        `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE email = ?`
      ).bind((user as any).email).run();

      const token = jwt.sign(
        { userId: (user as any).id, role: (user as any).role, username: (cleanerProfile as any).username },
        getJWTSecret(),
        { expiresIn: '24h' }
      );

      // Create session in database
      await db.prepare(
        `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+24 hours'))`
      ).bind((user as any).id, token).run();

      return NextResponse.json({
        token,
        role: (user as any).role,
        username: (cleanerProfile as any).username,
        user_id: (user as any).id,
        paysheet_code: (cleanerProfile as any).paysheet_code
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
