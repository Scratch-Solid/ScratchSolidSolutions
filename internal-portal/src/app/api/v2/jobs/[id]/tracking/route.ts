export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * GET /api/v2/jobs/[id]/tracking
 * Fetch tracking points for a job (supervisor/admin view).
 *
 * POST /api/v2/jobs/[id]/tracking
 * Submit a GPS tracking point (cleaner mobile app or WhatsApp location).
 * Auth: any authenticated user
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
  const { id } = await params;
    const jobId = id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const points = await db
      .prepare(
        `SELECT id, latitude, longitude, recorded_at, accuracy_meters, source
         FROM job_tracking
         WHERE job_id = ?
         ORDER BY recorded_at DESC
         LIMIT ?`
      )
      .bind(jobId, Math.min(limit, 500))
      .all<any>();

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: (points.results || []).reverse(), // chronological order
      }),
      traceId
    );
  } catch (error) {
    console.error('Tracking fetch error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to fetch tracking', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff', 'cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
  const { id } = await params;
    const jobId = id;
    const body = (await request.json()) as any;

    const { latitude, longitude, accuracy, source = 'mobile_app' } = body;

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Invalid latitude or longitude' },
          { status: 400 }
        ),
        traceId
      );
    }

    await db
      .prepare(
        `INSERT INTO job_tracking (job_id, latitude, longitude, recorded_at, accuracy_meters, source)
         VALUES (?, ?, ?, datetime('now'), ?, ?)`
      )
      .bind(jobId, latitude, longitude, accuracy || null, source)
      .run();

    return withSecurityHeaders(
      NextResponse.json({ success: true, message: 'Tracking point recorded' }),
      traceId
    );
  } catch (error) {
    console.error('Tracking post error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to record tracking', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
