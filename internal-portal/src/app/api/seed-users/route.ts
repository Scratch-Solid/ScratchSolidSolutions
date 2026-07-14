export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getCloudflareContext } from '@/lib/runtime-context';

// This endpoint should only be used in development or with a special seed key
// In production, users should be created through proper admin interfaces
const SEED_KEY = process.env.SEED_KEY;

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await request.json() as { seedKey?: string; userType?: string; email?: string; password?: string; name?: string; phone?: string; department?: string; paysheetCode?: string };
    const { seedKey, userType, email, password, name, phone, department, paysheetCode } = body;

    // Verify seed key for security
    if (seedKey !== getSeedKey()) {
      return NextResponse.json({ error: 'Invalid seed key' }, { status: 403 });
    }

    const db = await getDb();
    if (!db) {
      console.error('Database unavailable (seed-users)');
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Validate required fields
    if (!email || !password || !userType) {
      return NextResponse.json({ error: 'Email, password, and userType are required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Determine role based on user type
    let role: string;
    if (userType === 'admin') {
      role = 'admin';
    } else if (userType === 'cleaner') {
      role = 'cleaner';
    } else if (userType === 'digital') {
      role = 'digital';
    } else if (userType === 'transport') {
      role = 'transport';
    } else {
      return NextResponse.json({ error: 'Invalid userType. Must be admin, cleaner, digital, or transport' }, { status: 400 });
    }

    // Hash password
    const password_hash = (await bcrypt.hash(password, 10)).replace('$2b$', '$2a$');

    // Create user
    const user = await db.prepare(
      `INSERT INTO users (email, password_hash, role, name, phone)
       VALUES (?, ?, ?, ?, ?) RETURNING *`
    ).bind(email, password_hash, role, name || email.split('@')[0], phone || '').first();

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create cleaner profile for staff roles
    if (['cleaner', 'digital', 'transport'].includes(role)) {
      const username = paysheetCode || `${department || 'Scratch'}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const dept = department || (role === 'cleaner' ? 'cleaning' : role === 'digital' ? 'digital' : 'transport');
      
      await db.prepare(
        `INSERT INTO cleaner_profiles (user_id, username, paysheet_code, department, status)
         VALUES (?, ?, ?, ?, 'idle')`
      ).bind((user as any).id, username, paysheetCode || username, dept).run();
    }

    // Generate JWT token
    const secret = await getJWTSecret();
    const token = await new SignJWT({ userId: (user as any).id, role, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(secret));

    return NextResponse.json({
      success: true,
      user: {
        id: (user as any).id,
        email,
        role,
        name: (user as any).name,
        phone: (user as any).phone,
        paysheetCode: paysheetCode || null
      },
      token,
      loginCredentials: {
        username: role === 'admin' ? email : (paysheetCode || phone),
        password
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Seed user error:', error);
    return NextResponse.json({ error: `Failed to seed user: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}

function getSeedKey(): string {
  if (!SEED_KEY) {
    throw new Error('SEED_KEY environment variable is required for seed-users endpoint');
  }
  return SEED_KEY;
}

async function getJWTSecret(): Promise<string> {
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const secret = (env as any)?.JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return secret;
  } catch {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return secret;
  }
}
