export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Custom login endpoint - temporarily restored due to Better-Auth D1 integration issues
 * 
 * Better-Auth is not recognizing the D1 database adapter, resulting in
 * "Email and password is not enabled" error. This endpoint provides
 * working authentication while Better-Auth integration is debugged.
 * 
 * TODO: Remove this endpoint once Better-Auth D1 integration is working
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    // Find user by email
    const userResult = await db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();

    if (!userResult) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, userResult.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: userResult.id, email: userResult.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Update login count
    await db.prepare(
      'UPDATE users SET login_count = login_count + 1 WHERE id = ?'
    ).bind(userResult.id).run();

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userResult.id,
        email: userResult.email,
        name: userResult.name,
        role: userResult.role,
        is_superuser: userResult.is_superuser,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Use POST to login'
  }, { status: 405 });
}
