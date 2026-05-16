export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      firstName?: string;
      lastName?: string;
      residentialAddress?: string;
      cellphone?: string;
      password?: string;
      confirmPassword?: string;
      profilePicture?: string;
      consentData?: any;
    };

    const { firstName, lastName, residentialAddress, cellphone, password, confirmPassword, profilePicture, consentData } = body;

    // Validate required fields
    if (!firstName || !lastName || !residentialAddress || !cellphone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate password if provided
    if (password && password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get username from consent data
    const username = consentData?.generatedUsername || consentData?.generated_username;
    if (!username) {
      return NextResponse.json({ error: 'Username not found in consent data' }, { status: 400 });
    }

    // Find user by username
    const user = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user profile
    const fullName = `${firstName} ${lastName}`;
    const updates: string[] = [];
    const params: any[] = [];

    updates.push('name = ?');
    params.push(fullName);

    updates.push('phone = ?');
    params.push(cellphone);

    if (residentialAddress) {
      updates.push('address = ?');
      params.push(residentialAddress);
    }

    // Update password if provided
    if (password && password.length >= 8) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
      updates.push('password_needs_reset = 0');
    }

    // Update profile picture if provided
    if (profilePicture) {
      updates.push('profile_picture = ?');
      params.push(profilePicture);
    }

    params.push((user as any).id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.prepare(query).bind(...params).run();

    return NextResponse.json({ success: true, message: 'Profile created successfully' }, { status: 200 });
  } catch (error) {
    console.error('Create profile error:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
