import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCleanerProfileByUserId, getCleanerProfileByUsername, createCleanerProfile, updateCleanerProfile } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString, validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const username = searchParams.get('username');

    let profile;
    if (userId) {
      profile = await getCleanerProfileByUserId(db, parseInt(userId));
    } else if (username) {
      profile = await getCleanerProfileByUsername(db, username);
    } else {
      // Get all cleaner profiles (admin only)
      if (authResult.payload?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      const result = await db.prepare('SELECT * FROM cleaner_profiles ORDER BY created_at DESC').all();
      return NextResponse.json(result.results || []);
    }

    if (!profile) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error fetching cleaner profile', error as Error);
    return NextResponse.json({ error: 'Failed to fetch cleaner profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      user_id?: number;
      username?: string;
      paysheet_code?: string;
      first_name?: string;
      last_name?: string;
      department?: string;
      residential_address?: string;
      cellphone?: string;
      profile_picture?: string;
      emergency_contact1_name?: string;
      emergency_contact1_phone?: string;
      emergency_contact2_name?: string;
      emergency_contact2_phone?: string;
      specialties?: string;
      rating?: number;
      status?: string;
    };

    const { user_id, username, paysheet_code, first_name, last_name, department } = body;

    if (!user_id || !username) {
      return NextResponse.json({ error: 'Missing required fields: user_id, username' }, { status: 400 });
    }

    const profile = await createCleanerProfile(db, {
      user_id,
      username,
      paysheet_code,
      first_name,
      last_name,
      department
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    logger.error('Error creating cleaner profile', error as Error);
    return NextResponse.json({ error: 'Failed to create cleaner profile' }, { status: 500 });
  }
}
