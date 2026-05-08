import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    logger.info('Testing forgot password flow...');
    
    // Test database connection
    const db = await getDb();
    if (!db) {
      logger.error('Database connection failed');
      return NextResponse.json({ error: "Database connection failed" }, { status: 503 });
    }
    logger.info('Database connection successful');

    // Test user lookup
    const user = await getUserByEmail(db, "jasetsha@gmail.com");
    if (!user) {
      logger.error('User not found');
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    logger.info('User found', { userId: user.id, email: user.email });

    // Test email service
    const resetLink = "https://scratchsolidsolutions.org/reset-password?token=test-token";
    const emailResult = await sendPasswordResetEmail("jasetsha@gmail.com", resetLink);
    if (!emailResult.success) {
      logger.error('Email service failed', { error: emailResult.error });
      return NextResponse.json({ error: "Email service failed", details: emailResult.error }, { status: 500 });
    }
    logger.info('Email sent successfully');

    return NextResponse.json({
      message: "Test successful",
      user: { id: user.id, email: user.email },
      emailResult
    });

  } catch (error) {
    logger.error('Test failed', error as Error);
    return NextResponse.json({ 
      error: "Test failed", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
