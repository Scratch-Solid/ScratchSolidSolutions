export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createEmailVerificationToken } from "@/lib/db";
import { sanitizeEmail } from "@/lib/sanitization";

// Direct Resend API call
async function sendEmailVerificationEmailDirect(to: string, name: string, verifyLink: string) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY not found in environment');
      return { success: false, error: 'Email service not configured' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Verify your email</title></head>
      <body style="font-family: Arial, sans-serif; background: #f4f6fb; padding: 32px;">
        <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="color: #1a2a5e; margin-top: 0;">Verify your email address</h2>
          <p style="color: #374151;">Hi ${name},</p>
          <p style="color: #374151;">Please verify your email address to activate your account.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyLink}" style="background: #1a2a5e; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Verify Email Address</a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">This link expires in 24 hours. If you did not create an account, please ignore this email.</p>
          <p style="color: #6b7280; font-size: 12px;">Or copy this link: <a href="${verifyLink}" style="color: #1a2a5e;">${verifyLink}</a></p>
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
        subject: 'Verify your Scratch Solid Solutions account',
        html,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error:', result);
      return { success: false, error: `Email service error: ${JSON.stringify(result)}` };
    }

    console.log('Verification email sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string };
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }

    const user = await getUserByEmail(db, sanitizedEmail);
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 });
    }

    if ((user as any).email_verified) {
      return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
    }

    const verifyToken = await createEmailVerificationToken(db, (user as any).id);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org';
    const verifyLink = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;
    
    const emailResult = await sendEmailVerificationEmailDirect((user as any).email, (user as any).name || 'there', verifyLink);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json({ error: 'Failed to send verification email. Please contact support.' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Verification email sent successfully. Please check your email.'
    }, { status: 200 });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again.',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
