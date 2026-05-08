import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    if (username === 'it@scratchsolidsolutions.org' && password === '0736417176') {
      return NextResponse.json({
        token: 'mock-token-jason',
        expiresIn: 3600,
        role: 'admin',
        username: 'it@scratchsolidsolutions.org',
        user_id: 1,
        email: 'it@scratchsolidsolutions.org',
        name: 'Jason Tshaka'
      });
    }

    if (username === 'customerservice@scratchsolidsolutions.org' && password === '0746998097') {
      return NextResponse.json({
        token: 'mock-token-arnica',
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
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
