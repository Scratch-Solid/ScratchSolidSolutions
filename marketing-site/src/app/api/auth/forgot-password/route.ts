export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, getUserByPhone, createPasswordResetToken } from "@/lib/db";
import { sanitizeEmail, sanitizePhone } from "@/lib/sanitization";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { getCloudflareContext } from '@/lib/runtime-context';

// Direct Resend API call - bulletproof approach
async function sendPasswordResetEmail(to: string, resetLink: string) {
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const apiKey = (env as any)?.RESEND_API_KEY || process.env.RESEND_API_KEY;
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
          .header { background: #2E1F16; color: #F7F2EA; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #B08A5E; color: #2E1F16; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
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
            <p style="word-break: break-all; color: #8a6a45;">${resetLink}</p>
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
  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many password reset requests. Please try again later.' },
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
    } else if (type === "business") {
      // Find business by email
      const email = sanitizeEmail(identifier);
      user = await getUserByEmail(db, email);
    } else {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

    // Generic, account-existence-agnostic response. Do not reveal whether a
    // matching account exists (or has an email on file) — doing so lets an
    // attacker enumerate valid phone numbers/emails. Same message and status
    // are returned whether or not a user was found.
    const genericMessage = "If an account matches those details, a password reset link has been sent to the associated email address.";

    if (!user || !(user as any).email) {
      return NextResponse.json({ message: genericMessage }, { status: 200 });
    }

    // Create reset token
    const resetToken = await createPasswordResetToken(db, (user as any).id, null, "email");
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/reset-password?token=${resetToken}`;

    // Send email
    const userEmail = (user as any).email;
    const emailResult = await sendPasswordResetEmail(userEmail, resetLink);

    if (!emailResult.success) {
      // Log the real failure server-side, but keep the client-facing
      // response identical to the success/not-found case.
      console.error('Email send failed:', emailResult.error);
    }

    return NextResponse.json({ message: genericMessage }, { status: 200 });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ 
      error: "An unexpected error occurred. Please try again.",
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
