import { NextRequest, NextResponse } from 'next/server';
import { getDb, deleteSession } from "@/lib/db";
import jwt from 'jsonwebtoken';
import { logger } from "@/lib/logger";
import { getJWTSecret } from "@/lib/env";

export async function POST(request: NextRequest) {
  const db = getDb(request);
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
