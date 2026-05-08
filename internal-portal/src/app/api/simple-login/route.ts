import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    if (username === 'it@scratchsolidsolutions.org' && password === '0736417176') {
      const token = jwt.sign(
        { userId: 1, role: 'admin', email: 'it@scratchsolidsolutions.org' },
        'fallback-secret-key-123456789012345678901234567890',
        { expiresIn: '1h' }
      );

      return NextResponse.json({
        token,
        expiresIn: 3600,
        role: 'admin',
        username: 'it@scratchsolidsolutions.org',
        user_id: 1,
        email: 'it@scratchsolidsolutions.org',
        name: 'Jason Tshaka'
      });
    }

    if (username === 'customerservice@scratchsolidsolutions.org' && password === '0746998097') {
      const token = jwt.sign(
        { userId: 2, role: 'admin', email: 'customerservice@scratchsolidsolutions.org' },
        'fallback-secret-key-123456789012345678901234567890',
        { expiresIn: '1h' }
      );

      return NextResponse.json({
        token,
        expiresIn: 3600,
        role: 'admin',
        username: 'customerservice@scratchsolidsolutions.org',
        user_id: 2,
        email: 'customerservice@scratchsolidsolutions.org',
        name: 'Arnica Nqayi'
      });
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
