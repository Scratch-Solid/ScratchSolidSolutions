import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { validateLogin, isAccountLocked, sanitizeEmail, sanitizeString, sanitizePhone } from '../../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

function getJWTSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  return JWT_SECRET;
}

export async function POST(request: NextRequest) {
  const db = getDb(request);
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const body = await request.json();
    const { username: rawUsername, password } = body;

    if (!rawUsername || !password) {
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
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const token = jwt.sign(
        { userId: (user as any).id, role: (user as any).role, email: (user as any).email },
        getJWTSecret(),
        { expiresIn: '24h' }
      );

      return NextResponse.json({
        token,
        user: {
          id: (user as any).id,
          email: (user as any).email,
          role: (user as any).role,
          name: (user as any).name
        }
      });
    } else {
      // Cleaner login using paysheet code
      if (await isAccountLocked(db, username)) {
        return NextResponse.json({ error: 'Account temporarily locked. Try again later.' }, { status: 423 });
      }
      const cleanerProfile = await db.prepare(
        'SELECT * FROM cleaner_profiles WHERE paysheet_code = ?'
      ).bind(username).first();

      if (!cleanerProfile) {
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
        await db.prepare('UPDATE users SET failed_attempts = COALESCE(failed_attempts, 0) + 1, locked_until = CASE WHEN COALESCE(failed_attempts, 0) + 1 >= 5 THEN datetime(\'now\', \'+15 minutes\') ELSE locked_until END WHERE email = ?').bind((user as any).email).run();
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      // Reset failed attempts on success
      await db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE email = ?').bind((user as any).email).run();

      const token = jwt.sign(
        { userId: (user as any).id, role: (user as any).role, username: (cleanerProfile as any).username },
        getJWTSecret(),
        { expiresIn: '24h' }
      );

      return NextResponse.json({
        token,
        user: {
          id: (user as any).id,
          username: (cleanerProfile as any).username,
          role: (user as any).role,
          paysheetCode: (cleanerProfile as any).paysheet_code
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
