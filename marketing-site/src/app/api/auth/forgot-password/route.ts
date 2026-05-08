import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, getUserByPhone, createPasswordResetToken } from "@/lib/db";
import { sanitizeEmail, sanitizePhone } from "@/lib/sanitization";
import { logger } from "@/lib/logger";

// Simple, robust email function
async function sendSimpleEmail(to: string, subject: string, html: string) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.error('RESEND_API_KEY not found in environment');
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    logger.info('Attempting to send email', { to, subject, hasApiKey: !!apiKey });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>',
        to,
        subject,
        html,
      }),
    });

    const result = await response.json();
    logger.info('Resend API response', { status: response.status, result });

    if (!response.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(result)}`);
    }

    return { success: true, data: result };
  } catch (error) {
    logger.error('Email send failed', error as Error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('=== FORGOT PASSWORD REQUEST START ===');
    
    // Test 1: Database connection
    logger.info('Testing database connection...');
    const db = await getDb();
    if (!db) {
      logger.error('Database connection failed');
      return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
    }
    logger.info('Database connection successful');

    // Test 2: Parse request
    logger.info('Parsing request body...');
    const body = await request.json() as { type?: string; identifier?: string };
    const { type, identifier } = body;
    logger.info('Request parsed', { type, identifier });

    if (!type || !identifier) {
      logger.error('Missing required fields', { type, identifier });
      return NextResponse.json({ error: "Account type and identifier are required" }, { status: 400 });
    }

    // Test 3: Find user
    logger.info('Looking up user...');
    let user;
    
    if (type === "individual") {
      const phone = sanitizePhone(identifier);
      logger.info('Looking up individual by phone', { phone });
      user = await getUserByPhone(db, phone);

      if (!user) {
        logger.error('Individual not found', { phone });
        return NextResponse.json({ error: "No account found with this phone number" }, { status: 404 });
      }

      if (!(user as any).email) {
        logger.error('Individual has no email', { phone });
        return NextResponse.json({ error: "Your account does not have an email address. Please contact support to reset your password." }, { status: 400 });
      }
    } else if (type === "business") {
      const email = sanitizeEmail(identifier);
      logger.info('Looking up business by email', { email });
      user = await getUserByEmail(db, email);

      if (!user) {
        logger.error('Business not found', { email });
        return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
      }
    } else {
      logger.error('Invalid account type', { type });
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

    logger.info('User found', { userId: (user as any).id, email: (user as any).email });

    // Test 4: Create reset token
    logger.info('Creating reset token...');
    const resetToken = await createPasswordResetToken(db, (user as any).id, null, "email");
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org'}/reset-password?token=${resetToken}`;
    logger.info('Reset token created', { resetToken, resetLink });

    // Test 5: Send email
    logger.info('Sending password reset email...');
    const userEmail = (user as any).email;
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

    const emailResult = await sendSimpleEmail(userEmail, 'Reset Your Password - Scratch Solid Solutions', html);
    
    if (!emailResult.success) {
      logger.error('Email send failed', { error: emailResult.error });
      return NextResponse.json({ error: "Failed to send reset email. Please contact support." }, { status: 500 });
    }

    logger.info('Email sent successfully', { email: userEmail });
    logger.info('=== FORGOT PASSWORD REQUEST SUCCESS ===');

    return NextResponse.json({
      message: "A password reset link has been sent to your email address."
    }, { status: 200 });

  } catch (error) {
    logger.error('=== FORGOT PASSWORD REQUEST FAILED ===', error as Error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Detailed error information', {
      message: errorMessage,
      type: typeof error,
      constructor: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json({ 
      error: "An unexpected error occurred. Please try again.",
      ...(process.env.NODE_ENV === 'development' ? { debug: errorMessage } : {})
    }, { status: 500 });
  }
}
