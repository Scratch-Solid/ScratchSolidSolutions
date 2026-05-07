import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withSecurityHeaders, withTracing, withRateLimit } from '@/lib/middleware';
import { sanitizeRequestBody } from '@/lib/sanitization';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const body = await request.json();

  // Sanitize input
  const { sanitized, error } = sanitizeRequestBody(body, {
    required: ['firstName', 'lastName', 'residentialAddress', 'cellphone', 'password'],
    optional: ['profilePicture', 'consentData'],
    phoneFields: ['cellphone']
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const { firstName, lastName, residentialAddress, cellphone, password, profilePicture, consentData } = sanitized as any;

  try {
    // Check if contract exists and is approved
    const contract = await db.prepare('SELECT * FROM pending_contracts WHERE contact_number = ? AND id_passport_number = ? ORDER BY submitted_at DESC LIMIT 1')
      .bind(consentData.contactNumber, consentData.idPassportNumber).first();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if ((contract as any).status !== 'approved') {
      return NextResponse.json({ error: 'Your application has not been approved yet' }, { status: 400 });
    }

    // Check if user already exists
    const email = (contract as any).contact_number + '@scratchsolid.co.za';
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Determine role based on department
    const role = (contract as any).department === 'Scratch' ? 'cleaner' : 
                 (contract as any).department === 'Solid' ? 'digital' : 'transport';

    // Create user
    const user = await db.prepare(
      `INSERT INTO users (email, password_hash, role, name, phone)
       VALUES (?, ?, ?, ?, ?) RETURNING *`
    ).bind(
      email,
      password_hash,
      role,
      (contract as any).full_name,
      (contract as any).contact_number
    ).first();

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create cleaner profile with additional info
    await db.prepare(
      `INSERT INTO cleaner_profiles (user_id, username, paysheet_code, department, status, first_name, last_name, residential_address, cellphone, profile_picture)
       VALUES (?, ?, ?, ?, 'idle', ?, ?, ?, ?, ?)`
    ).bind(
      (user as any).id,
      (contract as any).generated_username,
      (contract as any).generated_username,
      (contract as any).department === 'Scratch' ? 'cleaning' : (contract as any).department === 'Solid' ? 'digital' : 'transport',
      firstName,
      lastName,
      residentialAddress,
      cellphone,
      profilePicture || null
    ).run();

    // Update contract status to profile_created
    await db.prepare(
      `UPDATE pending_contracts SET status = 'profile_created', updated_at = datetime('now') WHERE id = ?`
    ).bind((contract as any).id).run();

    const response = NextResponse.json({ success: true, userId: (user as any).id });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Create profile error:', error);
    const response = NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
