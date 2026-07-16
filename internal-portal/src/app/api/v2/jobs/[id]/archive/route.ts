export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * GET /api/v2/jobs/[id]/archive
 * Return a complete digital archive of a job:
 *   – job details
 *   – checklist items grouped by room
 *   – photos per room
 *   – tracking summary (start / end coordinates)
 *   – QA review scores
 * Auth: admin, staff, or cleaner (own jobs)
 */

export async function GET(
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

    // ─── Job details ───
    const job = await db
      .prepare(
        `SELECT
          j.id, j.calcom_uid, j.client_name, j.client_email, j.client_phone,
          j.property_type, j.property_address, j.property_unit_name,
          j.special_requests, j.service_type, j.scheduled_at,
          j.duration_minutes, j.status, j.supervisor_id, j.team_members,
          j.zoho_invoice_id, j.total_amount_cents, j.payment_status,
          j.created_at, j.updated_at
        FROM jobs j
        WHERE j.id = ?`
      )
      .bind(jobId)
      .first<any>();

    if (!job) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 }),
        traceId
      );
    }

    // ─── Checklists ───
    const checklists = await db
      .prepare(
        `SELECT room_name, task_description, is_completed, completed_by, completed_at, photo_url
         FROM job_checklists
         WHERE job_id = ?
         ORDER BY room_name, id`
      )
      .bind(jobId)
      .all<any>();

    const groupedChecklists = (checklists.results || []).reduce((acc: any, item: any) => {
      if (!acc[item.room_name]) acc[item.room_name] = [];
      acc[item.room_name].push(item);
      return acc;
    }, {});

    const checklistSummary = {
      total_items: (checklists.results || []).length,
      completed_items: (checklists.results || []).filter((i: any) => i.is_completed).length,
      completion_percentage:
        checklists.results && (checklists.results as any[]).length > 0
          ? Math.round(
              ((checklists.results || []).filter((i: any) => i.is_completed).length /
                (checklists.results as any[]).length) *
                100
            )
          : 0,
      by_room: groupedChecklists,
    };

    // ─── Photos ───
    const photos = await db
      .prepare(
        `SELECT room_name, photo_url, uploaded_by, uploaded_at
         FROM job_photos
         WHERE job_id = ?
         ORDER BY uploaded_at DESC`
      )
      .bind(jobId)
      .all<any>();

    const groupedPhotos = (photos.results || []).reduce((acc: any, item: any) => {
      if (!acc[item.room_name]) acc[item.room_name] = [];
      acc[item.room_name].push(item);
      return acc;
    }, {});

    // ─── Tracking summary ───
    const trackingPoints = await db
      .prepare(
        `SELECT latitude, longitude, timestamp, accuracy
         FROM job_tracking
         WHERE job_id = ?
         ORDER BY timestamp ASC`
      )
      .bind(jobId)
      .all<any>();

    const trackingSummary = {
      total_points: (trackingPoints.results || []).length,
      first_point: (trackingPoints.results || [])[0] || null,
      last_point: (trackingPoints.results || []).slice(-1)[0] || null,
    };

    // ─── QA / Performance metrics ───
    const metrics = await db
      .prepare(
        `SELECT client_score, adherence_score, attendance_score,
                company_values_score, ops_score, created_at
         FROM job_performance_metrics
         WHERE job_id = ?
         LIMIT 1`
      )
      .bind(jobId)
      .first<any>();

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: {
          job: {
            ...job,
            team_members: job.team_members ? JSON.parse(job.team_members) : [],
          },
          checklist: checklistSummary,
          photos: {
            total: (photos.results || []).length,
            by_room: groupedPhotos,
          },
          tracking: trackingSummary,
          qa_metrics: metrics || null,
        },
      }),
      traceId
    );
  } catch (error) {
    console.error('Archive fetch error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to load archive', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
