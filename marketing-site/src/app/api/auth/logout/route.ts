import { NextRequest, NextResponse } from 'next/server';
import { getDb, deleteSession } from "@/lib/db";
import jwt from 'jsonwebtoken';
import { logger } from "@/lib/logger";
import { getJWTSecret } from "@/lib/env";
import { withRateLimit, rateLimits } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.auth);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many logout attempts. Please try again later.' },
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
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    try {
      jwt.verify(token, getJWTSecret());
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Delete session from database
    await deleteSession(db, token);

    return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  } catch (error) {
    logger.error('Error during logout', error as Error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
