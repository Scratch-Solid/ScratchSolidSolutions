import { NextRequest, NextResponse } from 'next/server';
import { getDb, validatePasswordResetToken, deletePasswordResetToken, getUserById } from "@/lib/db";
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { token, otp, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    // Validate the reset token
    const resetToken = await validatePasswordResetToken(db, token);
    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset token. Please request a new password reset." }, { status: 400 });
    }

    // For WhatsApp method, verify OTP
    if ((resetToken as any).method === 'whatsapp') {
      if (!otp) {
        return NextResponse.json({ error: "OTP is required for WhatsApp verification" }, { status: 400 });
      }
      if ((resetToken as any).otp !== otp) {
        return NextResponse.json({ error: "Invalid OTP. Please check your WhatsApp messages." }, { status: 400 });
      }
    }

    // Validate password policy
    const pwdCheck = validatePasswordPolicy(newPassword);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: 'Password does not meet requirements', details: pwdCheck.errors }, { status: 400 });
    }

    // Get the user
    const user = await getUserById(db, (resetToken as any).user_id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(passwordHash, (user as any).id)
      .run();

    // Delete the reset token
    await deletePasswordResetToken(db, token);

    return NextResponse.json({ 
      message: "Password reset successfully. You can now login with your new password." 
    }, { status: 200 });

  } catch (error) {
    console.error('Error in reset password:', error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

function validatePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character');
  return { valid: errors.length === 0, errors };
}
