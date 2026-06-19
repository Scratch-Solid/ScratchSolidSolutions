export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { 
  applySecurityMiddleware, 
  checkRateLimit, 
  getRateLimitHeaders, 
  createSecurityError,
  createRateLimitError
} from '@/lib/security-middleware';
export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) {
    return createSecurityError('Database unavailable', 503);
  }

  // Get client identifier for rate limiting
  const clientId = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'anonymous';

  // Check rate limit
  const rateLimitResult = checkRateLimit(clientId, 'auth');
  if (!rateLimitResult.allowed) {
    const response = createRateLimitError(rateLimitResult.resetTime);
    const headers = getRateLimitHeaders(clientId, 'auth');
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  try {
    const body = await request.json() as { token?: string; newPassword?: string };
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return createSecurityError('Token and new password are required', 400);
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return createSecurityError('Password must be at least 8 characters', 400);
    }

    // Look up token in database
    const tokenRecord = await db.prepare(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token = ?`
    ).bind(token).first() as {
      id: number;
      user_id: number;
      expires_at: string;
      used_at: string | null;
    } | null;

    if (!tokenRecord) {
      return createSecurityError('Invalid or expired reset token', 400);
    }

    // Check if token already used
    if (tokenRecord.used_at) {
      return createSecurityError('Reset token has already been used', 400);
    }

    // Check if token expired
    const now = new Date().toISOString();
    if (now > tokenRecord.expires_at) {
      return createSecurityError('Reset token has expired', 400);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db.prepare(
      'UPDATE users SET password_hash = ?, password_needs_reset = 0, updated_at = datetime("now") WHERE id = ?'
    ).bind(passwordHash, tokenRecord.user_id).run();

    // Mark token as used
    await db.prepare(
      'UPDATE password_reset_tokens SET used_at = datetime("now") WHERE id = ?'
    ).bind(tokenRecord.id).run();

    const response = NextResponse.json({
      success: true,
      message: 'Password reset successful'
    });

    applySecurityMiddleware(response);
    return response;

  } catch (error) {
    console.error('Reset password error:', error);
    return createSecurityError('Failed to reset password', 500);
  }
}
