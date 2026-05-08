import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const adminUsers = [
      {
        email: 'it@scratchsolidsolutions.org',
        password: '0736417176',
        name: 'Jason Tshaka',
        role: 'admin',
        id: 1
      },
      {
        email: 'customerservice@scratchsolidsolutions.org', 
        password: '0746998097',
        name: 'Arnica Nqayi',
        role: 'admin',
        id: 2
      }
    ];

    const user = adminUsers.find(u => u.email === username);
    
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret-key-123456789012345678901234567890',
      { expiresIn: '1h' }
    );

    return NextResponse.json({
      token,
      expiresIn: 3600,
      role: user.role,
      username: user.email,
      user_id: user.id,
      email: user.email,
      name: user.name
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
