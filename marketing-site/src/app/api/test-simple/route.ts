import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Test 1: Basic environment variables
    const envVars = {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'NOT_SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NODE_ENV: process.env.NODE_ENV
    };

    // Test 2: Simple Resend API call
    let emailTest = { success: false, error: 'Not tested' };
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>',
            to: 'jasetsha@gmail.com',
            subject: 'Test Email - Scratch Solid Solutions',
            html: '<p>This is a test email to verify the Resend API is working.</p>',
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          emailTest = { success: true, data: result };
        } else {
          emailTest = { success: false, error: result };
        }
      } catch (error) {
        emailTest = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return NextResponse.json({
      message: "Diagnostic test completed",
      environment: envVars,
      emailTest
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Diagnostic failed", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
