export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { getJWTSecret } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, getJWTSecret()) as { id: number; email: string; role: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get user's email from JWT token
    const userEmail = decoded.email;

    // Fetch quotes for this user
    const quotes = await db.prepare(
      `SELECT * FROM quote_requests WHERE email = ? ORDER BY created_at DESC`
    ).bind(userEmail).all();

    return NextResponse.json({
      success: true,
      quotes: quotes.results || []
    });

  } catch (error) {
    console.error('Error fetching customer quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
