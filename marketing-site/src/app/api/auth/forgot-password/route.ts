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

    if (!type || !identifier) {
      return NextResponse.json({ error: "Account type and identifier are required" }, { status: 400 });
    }

    let user;

    if (type === "individual") {
      // For individuals, find by phone number
      const phone = sanitizePhone(identifier);
      user = await getUserByPhone(db, phone);
      
      if (!user) {
        return NextResponse.json({ error: "No account found with this phone number" }, { status: 404 });
      }

      // Generate and send WhatsApp OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const resetToken = await createPasswordResetToken(db, (user as any).id, otp, "whatsapp");

      // WhatsApp API requires paid service - no free option available
      // For now, we'll use email as fallback if user has email
      if ((user as any).email) {
        const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/reset-password?token=${resetToken}&method=whatsapp&otp=${otp}`;
        await sendPasswordResetEmail((user as any).email, resetLink);
        return NextResponse.json({ 
          message: "A password reset link has been sent to your email (WhatsApp integration requires paid API).",
          resetToken: resetToken
        }, { status: 200 });
      }
      
      // Log OTP for development/testing
      logger.info(`WhatsApp OTP for ${phone}: ${otp}`);
      
      return NextResponse.json({ 
        message: "WhatsApp integration requires paid API. Please contact support for password reset.",
        resetToken: resetToken
      }, { status: 200 });

    } else if (type === "business") {
      // For business, find by email
      const email = sanitizeEmail(identifier);
      user = await getUserByEmail(db, email);
      
      if (!user) {
        return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
      }

      // Generate and send email reset link
      const resetToken = await createPasswordResetToken(db, (user as any).id, null, "email");
      const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/reset-password?token=${resetToken}`;

      // Send email using Resend (free tier: 3,000 emails/month)
      await sendPasswordResetEmail(email, resetLink);
      
      return NextResponse.json({ 
        message: "A password reset link has been sent to your email. Please check your inbox.",
        resetToken: resetToken
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

  } catch (error) {
    logger.error('Error in forgot password', error as Error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
