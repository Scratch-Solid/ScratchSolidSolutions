export const dynamic = "force-dynamic";
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

    const db = await getDb();
    if (!db) {
      console.error('Database binding missing (expected scratchsolid_db or DB)');
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      );
    }

    // Ensure users table exists to avoid opaque errors
    const usersTable = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    if (!usersTable) {
      console.error('Database schema missing users table. Run migrations on D1.');
      return NextResponse.json({ success: false, error: 'Database not initialized' }, { status: 503 });
    }

    // Find user by email
    let user;
    try {
      user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(identifier).first();
    } catch (dbError) {
      console.error('Database error during user lookup:', dbError);
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

    // Ensure columns exist (idempotent — errors silently if column already present)
    await db.prepare('ALTER TABLE users ADD COLUMN password_needs_reset INTEGER DEFAULT 0').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN totp_secret TEXT').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN backup_codes TEXT').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN username TEXT').run().catch(() => {});
    const meta = await db.prepare('SELECT password_needs_reset, login_count FROM users WHERE id = ?').bind(user.id).first();
    (user as any).password_needs_reset = (meta as any)?.password_needs_reset ?? user.password_needs_reset;
    (user as any).login_count = (meta as any)?.login_count ?? user.login_count;
    // Increment login count for this successful login
    await db.prepare('UPDATE users SET login_count = COALESCE(login_count,0) + 1 WHERE id = ?').bind(user.id).run();
    const refreshed = await db.prepare('SELECT password_needs_reset, login_count FROM users WHERE id = ?').bind(user.id).first();
    (user as any).password_needs_reset = (refreshed as any)?.password_needs_reset ?? user.password_needs_reset;
    (user as any).login_count = (refreshed as any)?.login_count ?? user.login_count;
    // Block if password must be reset and user already logged in 3+ times with temp password
    if ((user as any).password_needs_reset === 1 && ((user as any).login_count ?? 0) >= 3) {
      return NextResponse.json({ success: false, error: 'Password change required', mustChangePassword: true }, { status: 403 });
    }

    // Enforce 2FA for privileged roles
    const privilegedRoles = ['admin', 'super_admin'];
    if (privilegedRoles.includes((user as any).role)) {
      const totpRow = await db.prepare('SELECT totp_enabled FROM users WHERE id = ?').bind(user.id).first();
      if ((totpRow as any)?.totp_enabled === 1) {
        // Issue a short-lived pre-auth token — full session requires TOTP verification
        const preAuthToken = crypto.randomUUID();
        await db.prepare(
          `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+5 minutes'))`
        ).bind(user.id, 'pre:' + preAuthToken).run();
        return NextResponse.json({
          success: false,
          require2FA: true,
          preAuthToken,
          message: '2FA verification required'
        }, { status: 202 });
      }
    }

    // Generate and persist session token
    const sessionToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    try {
      await db.prepare(
        `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))`
      ).bind(user.id, sessionToken).run();
    } catch (sessionErr) {
      console.error('Failed to persist session:', sessionErr);
    }
    
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
      token: sessionToken,
      role: user.role,
      username: (user as any).username || user.email,
      user_id: String(user.id),
      paysheet_code: (user as any).paysheet_code || '',
      mustChangePassword: (user as any)?.password_needs_reset === 1 && ((user as any)?.login_count ?? 0) === 2,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
