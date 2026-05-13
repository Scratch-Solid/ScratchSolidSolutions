export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail, createUser, createEmailVerificationToken } from "@/lib/db";
import { sanitizeEmail, sanitizeText, sanitizePhone } from "@/lib/sanitization";
import bcrypt from 'bcryptjs';
import { logger } from "@/lib/logger";
import { validateEmail, validatePassword } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";

// Direct Resend API call - bulletproof approach
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
          <p style="color: #374151;">Thanks for signing up with Scratch Solid Solutions. Please verify your email address to activate your account.</p>
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
  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
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
    const body = await request.json() as {
      type?: string;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      businessName?: string;
      registration?: string;
      password?: string;
      role?: string;
      business_info?: string;
    };
    const { type, name, email, phone, address, businessName, registration, password, role, business_info } = body;

    const rawName = name;
    const rawEmail = email;
    const rawPhone = phone;
    const rawAddress = address;

    const sanitizedName = sanitizeText(rawName || '');
    const sanitizedEmail = sanitizeEmail(rawEmail || '');
    const sanitizedPhone = sanitizePhone(rawPhone || '');
    const sanitizedAddress = sanitizeText(rawAddress || '');

    // Validate required fields
    if (!type || !sanitizedName || !sanitizedEmail || !password) {
      return NextResponse.json({ error: 'Please fill in all required fields (name, email, and password)' }, { status: 400 });
    }

    const emailValidation = validateEmail(sanitizedEmail);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.errors.join(', ') }, { status: 400 });
    }

    const pwdCheck = validatePassword(password || '');
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: 'Password does not meet requirements', details: pwdCheck.errors }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(db, sanitizedEmail);
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists. Please login or use a different email.' }, { status: 409 });
    }

    // Handle business signup
    if (type === 'business') {
      if (!businessName) {
        return NextResponse.json({ error: 'Business name is required for business signup' }, { status: 400 });
      }

      const user = await createUser(db, {
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        address: sanitizedAddress,
        business_name: businessName,
        business_registration: registration,
        password_hash: await bcrypt.hash(password, 10),
        role: 'business'
      });

      if (!user) {
        return NextResponse.json({ error: 'Failed to create business account' }, { status: 500 });
      }

      const verifyToken = await createEmailVerificationToken(db, (user as any).id);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org';
      const verifyLink = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;
      
      const emailResult = await sendEmailVerificationEmailDirect((user as any).email, (user as any).name || 'there', verifyLink);
      
      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        return NextResponse.json({ error: 'Account created but failed to send verification email. Please contact support.' }, { status: 500 });
      }

      return NextResponse.json({
        id: (user as any).id,
        email: (user as any).email,
        role: (user as any).role,
        name: (user as any).name,
        message: 'Business account created successfully. Please check your email to verify your account.'
      }, { status: 201 });
    }

    // Handle individual signup
    const user = await createUser(db, {
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      address: sanitizedAddress,
      password_hash: await bcrypt.hash(password, 10),
      role: 'client'
    });

    if (!user) {
      return NextResponse.json({ error: 'Unable to create account. Please try again or contact support.' }, { status: 500 });
    }

    const verifyToken = await createEmailVerificationToken(db, (user as any).id);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org';
    const verifyLink = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;
    
    const emailResult = await sendEmailVerificationEmailDirect((user as any).email, (user as any).name || 'there', verifyLink);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json({ error: 'Account created but failed to send verification email. Please contact support.' }, { status: 500 });
    }

    return NextResponse.json({
      id: (user as any).id,
      email: (user as any).email,
      role: (user as any).role,
      name: (user as any).name,
      message: 'Account created successfully. Please check your email to verify your account.'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating user', error as Error);
    return NextResponse.json({ error: 'An unexpected error occurred during signup. Please try again.' }, { status: 500 });
  }
}
