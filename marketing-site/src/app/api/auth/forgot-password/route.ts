import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, getUserByPhone, createPasswordResetToken, sanitizeEmail, sanitizePhone } from "@/lib/db";

export async function POST(request: NextRequest) {
  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const body = await request.json();
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

      // TODO: Integrate WhatsApp API to send OTP
      // For now, we'll simulate sending
      console.log(`WhatsApp OTP for ${phone}: ${otp}`);
      
      return NextResponse.json({ 
        message: "A verification code has been sent to your WhatsApp. Please check your messages.",
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

      // TODO: Integrate email service to send reset link
      // For now, we'll simulate sending
      console.log(`Email reset link for ${email}: ${resetLink}`);
      
      return NextResponse.json({ 
        message: "A password reset link has been sent to your email. Please check your inbox.",
        resetToken: resetToken
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
