import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, getUserByPhone, createPasswordResetToken, sanitizeEmail, sanitizePhone } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
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
    const body = await request.json() as { type?: string; identifier?: string };
    const { type, identifier } = body;

    logger.info('Password reset request', { type, identifier });

    if (!type || !identifier) {
      return NextResponse.json({ error: "Account type and identifier are required" }, { status: 400 });
    }

    let user;

    if (type === "individual") {
      // For individuals, find by phone number
      const phone = sanitizePhone(identifier);
      logger.info('Looking up individual by phone', { phone });
      user = await getUserByPhone(db, phone);

      if (!user) {
        logger.warn('Individual not found by phone', { phone });
        return NextResponse.json({ error: "No account found with this phone number" }, { status: 404 });
      }

      // Generate and send WhatsApp OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const resetToken = await createPasswordResetToken(db, (user as any).id, otp, "whatsapp");

      // WhatsApp API requires paid service - no free option available
      // For now, we'll use email as fallback if user has email
      if ((user as any).email) {
        const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/reset-password?token=${resetToken}&method=whatsapp&otp=${otp}`;
        logger.info('Sending password reset email to individual', { email: (user as any).email, resetLink });
        const emailResult = await sendPasswordResetEmail((user as any).email, resetLink);
        if (!emailResult.success) {
          logger.error('Failed to send password reset email', { error: emailResult.error });
          return NextResponse.json({ error: "Failed to send reset email. Please contact support." }, { status: 500 });
        }
        return NextResponse.json({
          message: "A password reset link has been sent to your email address."
        }, { status: 200 });
      }

      return NextResponse.json({
        message: "If a matching account was found, a reset link has been sent. Please contact support if you have no email on file."
      }, { status: 200 });

    } else if (type === "business") {
      // For business, find by email
      const email = sanitizeEmail(identifier);
      logger.info('Looking up business by email', { email });
      user = await getUserByEmail(db, email);

      if (!user) {
        logger.warn('Business not found by email', { email });
        return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
      }

      // Generate and send email reset link
      const resetToken = await createPasswordResetToken(db, (user as any).id, null, "email");
      const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/reset-password?token=${resetToken}`;

      logger.info('Sending password reset email to business', { email, resetLink });
      const emailResult = await sendPasswordResetEmail(email, resetLink);
      if (!emailResult.success) {
        logger.error('Failed to send password reset email', { error: emailResult.error });
        return NextResponse.json({ error: "Failed to send reset email. Please contact support." }, { status: 500 });
      }

      return NextResponse.json({
        message: "A password reset link has been sent to your email. Please check your inbox."
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

  } catch (error) {
    logger.error('Error in forgot password', error as Error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
