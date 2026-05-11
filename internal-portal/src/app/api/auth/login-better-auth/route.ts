import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logSessionActivity } from '@/lib/session-activity-logger';
import { getGeolocation } from '@/lib/geolocation-tracker';
import { generateDeviceFingerprint, parseUserAgent } from '@/lib/device-fingerprint';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string; password?: string; username?: string; identifier?: string };
    const identifier = body.identifier || body.username || body.email;
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Email/username and password required' },
        { status: 400 }
      );
    }

    let user;
    try {
      const db = await getDb();
      // Find user by email or username
      user = await db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').bind(identifier, identifier).first();
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      );
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

    // Ensure columns and fetch login counters
    const db = await getDb();
    if (db) {
      await db.prepare('ALTER TABLE users ADD COLUMN password_needs_reset INTEGER DEFAULT 0').run().catch(() => {});
      await db.prepare('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0').run().catch(() => {});
      const meta = await db.prepare('SELECT password_needs_reset, login_count FROM users WHERE id = ?').bind(user.id).first();
      (user as any).password_needs_reset = (meta as any)?.password_needs_reset ?? user.password_needs_reset;
      (user as any).login_count = (meta as any)?.login_count ?? user.login_count;
      // Block if password must be reset and user already logged in twice with temp password
      if ((user as any).password_needs_reset === 1 && ((user as any).login_count ?? 0) >= 2) {
        return NextResponse.json({ success: false, error: 'Password change required', mustChangePassword: true }, { status: 403 });
      }
      // Increment login count for this successful login
      await db.prepare('UPDATE users SET login_count = COALESCE(login_count,0) + 1 WHERE id = ?').bind(user.id).run();
      const refreshed = await db.prepare('SELECT password_needs_reset, login_count FROM users WHERE id = ?').bind(user.id).first();
      (user as any).password_needs_reset = (refreshed as any)?.password_needs_reset ?? user.password_needs_reset;
      (user as any).login_count = (refreshed as any)?.login_count ?? user.login_count;
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
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          mustChangePassword: (user as any)?.password_needs_reset === 1
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
