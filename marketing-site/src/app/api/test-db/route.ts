import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    logger.info('Testing database connection...');
    
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

    return NextResponse.json({
      message: "Database test successful",
      user: { id: user.id, email: user.email, role: user.role }
    });

  } catch (error) {
    logger.error('Database test failed', error as Error);
    return NextResponse.json({ 
      error: "Database test failed", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
