import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, getUserByPhone, createPasswordResetToken } from "@/lib/db";
import { sanitizeEmail, sanitizePhone } from "@/lib/sanitization";

// Direct Resend API call - bulletproof approach
async function sendPasswordResetEmail(to: string, resetLink: string) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY not found in environment');
      return { success: false, error: 'Email service not configured' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Scratch Solid Solutions</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>You recently requested to reset your password for your Scratch Solid Solutions account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request this password reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Scratch Solid Solutions. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>',
        to,
        subject: 'Reset Your Password - Scratch Solid Solutions',
        html,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error:', result);
      return { success: false, error: `Email service error: ${JSON.stringify(result)}` };
    }

    console.log('Email sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = await request.json() as { type?: string; identifier?: string };
    const { type, identifier } = body;

    if (!type || !identifier) {
      return NextResponse.json({ error: "Account type and identifier are required" }, { status: 400 });
    }

    // Database connection
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
    }

    let user;

    if (type === "individual") {
      // Find individual by phone
      const phone = sanitizePhone(identifier);
      user = await getUserByPhone(db, phone);

      if (!user) {
        return NextResponse.json({ error: "No account found with this phone number" }, { status: 404 });
      }

      if (!(user as any).email) {
        return NextResponse.json({ error: "Your account does not have an email address. Please contact support to reset your password." }, { status: 400 });
      }
    } else if (type === "business") {
      // Find business by email
      const email = sanitizeEmail(identifier);
      user = await getUserByEmail(db, email);

      if (!user) {
        return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

    // Create reset token
    const resetToken = await createPasswordResetToken(db, (user as any).id, null, "email");
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/reset-password?token=${resetToken}`;

    // Send email
    const userEmail = (user as any).email;
    const emailResult = await sendPasswordResetEmail(userEmail, resetLink);
    
    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      return NextResponse.json({ error: "Failed to send reset email. Please contact support." }, { status: 500 });
    }

    return NextResponse.json({
      message: "A password reset link has been sent to your email address."
    }, { status: 200 });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ 
      error: "An unexpected error occurred. Please try again.",
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
