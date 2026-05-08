import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, validateLogin } from '../../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-123456789012345678901234567890';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const user = await validateLogin(db, username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: (user as any).id, role: (user as any).role, email: (user as any).email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return NextResponse.json({
      token,
      expiresIn: 3600,
      role: (user as any).role,
      username: (user as any).email,
      user_id: (user as any).id,
      email: (user as any).email,
      name: (user as any).name
    });

  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
