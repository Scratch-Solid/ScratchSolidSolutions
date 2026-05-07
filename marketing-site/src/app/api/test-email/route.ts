import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    logger.info('=== Testing email service directly ===');
    
    const result = await sendPasswordResetEmail('test@example.com', 'https://scratchsolidsolutions.org/reset-password?token=test-123');
    
    logger.info('Email service result', { result });
    
    return NextResponse.json({ 
      success: true,
      result 
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
