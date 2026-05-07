import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, sanitizeEmail } from '@/lib/db';
import { withRateLimit, withSecurityHeaders, withTracing, logRequest, getClientIP, withCsrf } from '@/lib/middleware';
import { logAuthFailure } from '@/lib/security-logger';
import bcrypt from 'bcryptjs';

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const startTime = Date.now();
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return withSecurityHeaders(rateLimitResponse, traceId);
  }

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) {
    return withSecurityHeaders(csrfResponse, traceId);
  }

  const db = await getDb();
  if (!db) {
    const response = NextResponse.json({ error: 'Database not available' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }

  try {
    const body = await request.json() as { token?: string; newPassword?: string };
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      const response = NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.valid) {
      const response = NextResponse.json({ error: 'Password does not meet requirements', details: pwdCheck.errors }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Find valid reset token
    const resetToken = await db.prepare(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > datetime('now')`
    ).bind(token).first();

    if (!resetToken) {
      logAuthFailure('Invalid or expired reset token', { token: token.substring(0, 8) + '...', ip: getClientIP(request) });
      const response = NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Get user from reset token
    const user = await db.prepare(
      `SELECT * FROM users WHERE id = ?`
    ).bind((resetToken as any).user_id).first();

    if (!user) {
      const response = NextResponse.json({ error: 'User not found' }, { status: 404 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await db.prepare(
      `UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?`
    ).bind(passwordHash, (user as any).id).run();

    // Delete the used reset token
    await db.prepare(
      `DELETE FROM password_reset_tokens WHERE token = ?`
    ).bind(token).run();

    const response = NextResponse.json({ message: 'Password reset successful' });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Password reset error:', error);
    const response = NextResponse.json({ error: 'Password reset failed' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }
}
