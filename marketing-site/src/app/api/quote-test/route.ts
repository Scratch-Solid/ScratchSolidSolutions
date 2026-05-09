import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Simple test query to verify database connection works
    const test = await db.prepare('SELECT 1 as test').first();
    console.log('Database test result:', test);

    return NextResponse.json({ success: true, message: 'Quote-test API is working', test }, { status: 200 });
  } catch (error) {
    console.error('Error in quote-test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to process quote-test', details: errorMessage }, { status: 500 });
  }
}
