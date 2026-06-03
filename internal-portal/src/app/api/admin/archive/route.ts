export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * GET /api/admin/archive
 * List completed jobs with archive summary for QA review.
 * Supports pagination and date range filters.
 * Auth: admin or staff
 */

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const from = searchParams.get('from'); // YYYY-MM-DD
    const to = searchParams.get('to');     // YYYY-MM-DD
    const status = searchParams.get('status') || 'completed';

    let where = `WHERE j.status = ?`;
    const binds: (string | number)[] = [status];

    if (from) {
      where += ` AND date(j.scheduled_at) >= ?`;
      binds.push(from);
    }
    if (to) {
      where += ` AND date(j.scheduled_at) <= ?`;
      binds.push(to);
    }

    // Count total
    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM jobs j ${where}`)
      .bind(...binds)
      .first<{ total: number }>();

    const total = countResult?.total || 0;

    // Fetch jobs with metrics
    const jobs = await db
      .prepare(
        `SELECT
          j.id, j.client_name, j.property_type, j.scheduled_at,
          j.duration_minutes, j.status, j.payment_status,
          j.team_members, j.created_at, j.updated_at,
          jpm.client_score, jpm.adherence_score, jpm.ops_score,
          (SELECT COUNT(*) FROM job_checklists WHERE job_id = j.id) as checklist_total,
          (SELECT COUNT(*) FROM job_checklists WHERE job_id = j.id AND is_completed = 1) as checklist_completed,
          (SELECT COUNT(*) FROM job_photos WHERE job_id = j.id) as photo_count,
          (SELECT COUNT(*) FROM job_tracking WHERE job_id = j.id) as tracking_points
        FROM jobs j
        LEFT JOIN job_performance_metrics jpm ON jpm.job_id = j.id
        ${where}
        ORDER BY j.scheduled_at DESC
        LIMIT ? OFFSET ?`
      )
      .bind(...binds, pageSize, (page - 1) * pageSize)
      .all<any>();

    const results = (jobs.results || []).map((job: any) => ({
      ...job,
      team_members: job.team_members ? JSON.parse(job.team_members) : [],
      checklist_completion_pct:
        job.checklist_total > 0
          ? Math.round((job.checklist_completed / job.checklist_total) * 100)
          : 0,
    }));

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }),
      traceId
    );
  } catch (error) {
    console.error('Archive listing error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to fetch archive', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
