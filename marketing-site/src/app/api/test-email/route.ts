import { NextRequest, NextResponse } from 'next/server';
import { getResendApiKey } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    logger.info('=== Testing email service directly ===');
    
    // Test API key access
    const apiKey = getResendApiKey();
    logger.info('API key result', { hasApiKey: !!apiKey, keyLength: apiKey?.length });
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: "API key not accessible",
        debug: "getResendApiKey() returned null/undefined"
      }, { status: 500 });
    }
    
    // Test simple email send
    const { Resend } = require('resend');
    const resend = new Resend(apiKey);
    
    logger.info('Testing direct Resend API call');
    const result = await resend.emails.send({
      from: 'Scratch Solid Solutions <customerservice@scratchsolidsolutions.org>',
      to: 'test@example.com',
      subject: 'Test Email from Worker',
      html: '<h1>Test Email</h1><p>This is a test email from the Worker.</p>'
    });
    
    logger.info('Resend API result', { result });
    
    return NextResponse.json({ 
      success: true,
      apiKeyAccessible: !!apiKey,
      resendResult: result
    });
    
  } catch (error) {
    logger.error('Error in test email endpoint', error as Error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    
    logger.error('Detailed error information', {
      message: errorMessage,
      stack: errorStack,
      type: typeof error,
      constructor: error?.constructor?.name
    });
    
    return NextResponse.json({ 
      error: "Email test failed",
      debug: errorMessage,
      stack: errorStack
    }, { status: 500 });
  }
}
