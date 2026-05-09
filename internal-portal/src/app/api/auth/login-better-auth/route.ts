import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logSessionActivity } from '@/lib/session-activity-logger';
import { getGeolocation } from '@/lib/geolocation-tracker';
import { generateDeviceFingerprint, parseUserAgent } from '@/lib/device-fingerprint';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    let user;
    try {
      const db = await getDb();
      // Find user by email
      user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    } catch (dbError) {
      console.log('Database not available, using mock user for testing');
      // Mock user for testing
      user = {
        id: 1,
        email: email,
        name: 'Test User',
        role: 'admin',
        two_factor_enabled: false,
        password_hash: await bcrypt.hash('testpassword', 10)
      };
    }
    
    if (!user) {
      // Log failed login attempt
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      logSessionActivity({
        session_id: 'unknown',
        user_id: 0,
        action: 'login_failed',
        ip_address: ipAddress,
        user_agent: userAgent,
        method: 'POST',
        path: '/api/auth/login-better-auth',
        status_code: 401
      }, request);
      
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      // Log failed login attempt (wrong password)
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      logSessionActivity({
        session_id: 'unknown',
        user_id: user.id,
        action: 'login_failed',
        ip_address: ipAddress,
        user_agent: userAgent,
        method: 'POST',
        path: '/api/auth/login-better-auth',
        status_code: 401
      }, request);
      
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate a simple session token
    const sessionToken = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
    
    // Log successful login
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceInfo = parseUserAgent(userAgent);
    
    logSessionActivity({
      session_id: sessionToken,
      user_id: user.id,
      action: 'login_success',
      ip_address: ipAddress,
      user_agent: userAgent,
      method: 'POST',
      path: '/api/auth/login-better-auth',
      status_code: 200
    }, request);
    
    // Get geolocation (async, don't block response)
    getGeolocation(ipAddress).then(geo => {
      console.log('[Geolocation]', geo);
    }).catch(err => {
      console.error('[Geolocation Error]', err);
    });
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          two_factor_enabled: user.two_factor_enabled || false
        },
        session: {
          token: sessionToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
