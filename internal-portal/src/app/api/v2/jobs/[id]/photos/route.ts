export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * GET /api/v2/jobs/[id]/photos
 * Fetch QA photos for a job.
 *
 * POST /api/v2/jobs/[id]/photos
 * Record a photo URL (after upload to R2 / presigned URL flow).
 * Body: { room_name: string, photo_url: string, uploaded_by?: string }
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
    const roomName = searchParams.get('room');

    let query = `SELECT id, room_name, photo_url, uploaded_by, uploaded_at
                   FROM job_photos
                   WHERE job_id = ?`;
    const binds: (string | number)[] = [jobId];

    if (roomName) {
      query += ' AND room_name = ?';
      binds.push(roomName);
    }

    query += ' ORDER BY uploaded_at DESC';

    const photos = await db.prepare(query).bind(...binds).all<any>();

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: photos.results || [],
      }),
      traceId
    );
  } catch (error) {
    console.error('Photos fetch error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to fetch photos', traceId },
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
  const { db, user } = authResult;

  try {
  const { id } = await params;
    const jobId = id;
    const body = (await request.json()) as any;
    const { room_name, photo_url } = body;

    if (!room_name || !photo_url) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Missing room_name or photo_url' },
          { status: 400 }
        ),
        traceId
      );
    }

    const uploadedBy = user?.paysheet_code || user?.name || 'unknown';

    await db
      .prepare(
        `INSERT INTO job_photos (job_id, room_name, photo_url, uploaded_by, uploaded_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .bind(jobId, room_name, photo_url, uploadedBy)
      .run();

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        message: 'Photo recorded',
        data: { job_id: jobId, room_name, photo_url, uploaded_by: uploadedBy },
      }),
      traceId
    );
  } catch (error) {
    console.error('Photo record error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to record photo', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
