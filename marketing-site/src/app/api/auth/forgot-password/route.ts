import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, getUserByPhone, createPasswordResetToken } from "@/lib/db";
import { sanitizeEmail, sanitizePhone } from "@/lib/sanitization";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
    }

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

      // Check if user has email for password reset
      if (!(user as any).email) {
        logger.warn('Individual has no email on file', { phone });
        return NextResponse.json({ error: "Your account does not have an email address. Please contact support to reset your password." }, { status: 400 });
      }

      // Generate and send email reset link (WhatsApp not available)
      const resetToken = await createPasswordResetToken(db, (user as any).id, null, "email");
      const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/reset-password?token=${resetToken}`;
      logger.info('Sending password reset email to individual', { email: (user as any).email, resetLink });
      const emailResult = await sendPasswordResetEmail((user as any).email, resetLink);
      if (!emailResult.success) {
        logger.error('Failed to send password reset email', { error: emailResult.error });
        return NextResponse.json({ error: "Failed to send reset email. Please contact support." }, { status: 500 });
      }
      return NextResponse.json({
        message: "A password reset link has been sent to your email address."
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
    
    // Log more specific error details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    
    logger.error('Detailed error information', {
      message: errorMessage,
      stack: errorStack,
      type: typeof error,
      constructor: error?.constructor?.name
    });
    
    return NextResponse.json({ 
      error: "An unexpected error occurred. Please try again.",
      ...(process.env.NODE_ENV === 'development' ? { debug: errorMessage } : {})
    }, { status: 500 });
  }
}
