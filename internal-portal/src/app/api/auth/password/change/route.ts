export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  verifyAccessToken,
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
  logAuthEvent,
} from '@/lib/auth';

/**
 * Change Password Endpoint
 * 
 * Allows users to change their password with validation and history tracking.
 * Enforces strong password policies and prevents password reuse.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { currentPassword: string; newPassword: string };
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: 'Current password and new password are required'
      }, { status: 400 });
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Password does not meet requirements',
        details: validation.errors
      }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header required'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';

    // Get user's current password
    const userResult = await db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(decoded.userId).first();

    if (!userResult) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Verify current password
    const passwordMatch = await verifyPassword(currentPassword, (userResult as any).password_hash);
    if (!passwordMatch) {
      await logAuthEvent(db, decoded.userId, 'password_change_failed', ip, ua, { reason: 'current_password_incorrect' });
      return NextResponse.json({
        success: false,
        error: 'Current password is incorrect'
      }, { status: 401 });
    }

    // Check password history (prevent reuse of last 5 passwords)
    const passwordHistory = await db.prepare(
      'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
    ).bind(decoded.userId).all();

    for (const record of passwordHistory.results || []) {
      const isReused = await verifyPassword(newPassword, (record as any).password_hash);
      if (isReused) {
        return NextResponse.json({
          success: false,
          error: 'Cannot reuse a recent password'
        }, { status: 400 });
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password
    await db.prepare(
      'UPDATE users SET password_hash = ?, password_changed_at = ?, must_change_password = 0 WHERE id = ?'
    ).bind(newPasswordHash, Math.floor(Date.now() / 1000), decoded.userId).run();

    // Add to password history
    await db.prepare(
      'INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)'
    ).bind(decoded.userId, newPasswordHash).run();

    // Log password change
    await logAuthEvent(db, decoded.userId, 'password_changed', ip, ua);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
