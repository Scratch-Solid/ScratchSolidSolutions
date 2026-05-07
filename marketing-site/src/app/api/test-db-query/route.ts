import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    
    // Test if users table exists and query works
    const result = await db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `).first();
    
    console.log('Users table exists:', result);
    
    // Test if we can query users table
    if (result) {
      const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first();
      console.log('User count:', userCount);
      
      // Test specific user lookup
      const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind('jasetsha@gmail.com').first();
      console.log('User lookup result:', user);
      
      return NextResponse.json({
        usersTableExists: !!result,
        userCount: userCount?.count || 0,
        foundUser: user || null
      });
    } else {
      return NextResponse.json({ error: 'Users table not found' }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
