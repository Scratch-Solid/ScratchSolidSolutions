import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['customer', 'admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db, user } = authResult;

  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get user's email from auth result
    const userEmail = user.email;

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
