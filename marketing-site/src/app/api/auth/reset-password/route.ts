import { NextRequest, NextResponse } from 'next/server';
import { getDb, validatePasswordResetToken, deletePasswordResetToken, getUserById } from "@/lib/db";
import bcrypt from 'bcryptjs';
import { logger } from "@/lib/logger";
import { validatePassword } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many password reset attempts. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        }
      }
    );
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const body = await request.json() as { token?: string; otp?: string; newPassword?: string };
    const { token, otp, newPassword } = body;

    logger.info('Password reset attempt', { hasToken: !!token, hasPassword: !!newPassword, hasOTP: !!otp });

    if (!token || !newPassword) {
      logger.warn('Password reset missing required fields', { hasToken: !!token, hasPassword: !!newPassword });
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    // Validate the reset token
    const resetToken = await validatePasswordResetToken(db, token);
    if (!resetToken) {
      logger.warn('Password reset token invalid or expired', { token: token.substring(0, 8) + '...' });
      return NextResponse.json({ error: "Invalid or expired reset token. Please request a new password reset." }, { status: 400 });
    }

    logger.info('Password reset token validated', { userId: (resetToken as any).user_id, method: (resetToken as any).method });

    // Validate password policy
    const pwdCheck = validatePassword(newPassword || '');
    if (!pwdCheck.valid) {
      logger.warn('Password reset password validation failed', { errors: pwdCheck.errors });
      return NextResponse.json({ error: 'Password does not meet requirements', details: pwdCheck.errors }, { status: 400 });
    }

    // Get the user
    const user = await getUserById(db, (resetToken as any).user_id);
    if (!user) {
      logger.error('Password reset user not found', { userId: (resetToken as any).user_id });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    logger.info('Password reset updating password', { userId: (user as any).id, email: (user as any).email });

    // Update the password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(passwordHash, (user as any).id)
      .run();

    // Delete the reset token
    await deletePasswordResetToken(db, token);

    logger.info('Password reset successful', { userId: (user as any).id });

    return NextResponse.json({ 
      message: "Password reset successfully. You can now login with your new password." 
    }, { status: 200 });

  } catch (error) {
    logger.error('Error in reset password', error as Error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
