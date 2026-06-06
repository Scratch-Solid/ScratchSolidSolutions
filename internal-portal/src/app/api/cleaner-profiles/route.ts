export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner', 'digital', 'transport']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      user_id?: number;
      username?: string;
      paysheet_code?: string;
      first_name?: string;
      last_name?: string;
      residential_address?: string;
      cellphone?: string;
      emergency_contact1_name?: string;
      emergency_contact1_phone?: string;
      emergency_contact2_name?: string;
      emergency_contact2_phone?: string;
    };
    const {
      user_id,
      username,
      paysheet_code,
      first_name,
      last_name,
      residential_address,
      cellphone,
      emergency_contact1_name,
      emergency_contact1_phone,
      emergency_contact2_name,
      emergency_contact2_phone
    } = body;

    if (!user_id) {
      const response = NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Check if profile already exists
    const existing = await db.prepare('SELECT id FROM cleaner_profiles WHERE user_id = ?').bind(user_id).first();
    if (existing) {
      // Update existing profile
      await db.prepare(
        `UPDATE cleaner_profiles
         SET username = COALESCE(?, username),
             paysheet_code = COALESCE(?, paysheet_code),
             first_name = COALESCE(?, first_name),
             last_name = COALESCE(?, last_name),
             residential_address = COALESCE(?, residential_address),
             cellphone = COALESCE(?, cellphone),
             emergency_contact1_name = COALESCE(?, emergency_contact1_name),
             emergency_contact1_phone = COALESCE(?, emergency_contact1_phone),
             emergency_contact2_name = COALESCE(?, emergency_contact2_name),
             emergency_contact2_phone = COALESCE(?, emergency_contact2_phone),
             updated_at = datetime('now')
         WHERE user_id = ?`
      ).bind(
        username, paysheet_code, first_name, last_name, residential_address, cellphone,
        emergency_contact1_name, emergency_contact1_phone, emergency_contact2_name, emergency_contact2_phone,
        user_id
      ).run();
    } else {
      // Create new profile
      await db.prepare(
        `INSERT INTO cleaner_profiles 
         (user_id, username, paysheet_code, first_name, last_name, residential_address, cellphone,
          emergency_contact1_name, emergency_contact1_phone, emergency_contact2_name, emergency_contact2_phone,
          department, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cleaning', 'idle', datetime('now'), datetime('now'))`
      ).bind(
        user_id, username, paysheet_code, first_name, last_name, residential_address, cellphone,
        emergency_contact1_name, emergency_contact1_phone, emergency_contact2_name, emergency_contact2_phone
      ).run();
    }

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating/updating cleaner profile:', error);
    const response = NextResponse.json({ error: 'Failed to create cleaner profile' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner', 'digital', 'transport']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const profile = await db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').bind((user as any).id).first();
    const response = NextResponse.json(profile || null);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching cleaner profile:', error);
    const response = NextResponse.json({ error: 'Failed to fetch cleaner profile' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
