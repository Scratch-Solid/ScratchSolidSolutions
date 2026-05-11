export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, updateCleanerProfile, getCleanerProfileByUserId } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString, validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  try {
    const profile = await getCleanerProfileByUserId(db, parseInt(id));
    if (!profile) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error fetching cleaner profile', error as Error);
    return NextResponse.json({ error: 'Failed to fetch cleaner profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as Record<string, any>;
    const profile = await getCleanerProfileByUserId(db, parseInt(id));
    if (!profile) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    const updated = await updateCleanerProfile(db, (profile as any).username, body);
    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error updating cleaner profile', error as Error);
    return NextResponse.json({ error: 'Failed to update cleaner profile' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  try {
    await db.prepare('DELETE FROM cleaner_profiles WHERE user_id = ?').bind(parseInt(id)).run();
    return NextResponse.json({ message: 'Cleaner profile deleted' });
  } catch (error) {
    logger.error('Error deleting cleaner profile', error as Error);
    return NextResponse.json({ error: 'Failed to delete cleaner profile' }, { status: 500 });
  }
}
