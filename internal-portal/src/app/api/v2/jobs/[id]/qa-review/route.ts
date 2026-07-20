export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * POST /api/v2/jobs/[id]/qa-review
 * Submit a QA review for a completed job.
 * Updates or inserts job_performance_metrics row.
 * Auth: admin or staff (supervisor)
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
  const { id } = await params;
    const jobId = id;
    const body = (await request.json()) as any;
    const {
      client_score,
      adherence_score,
      attendance_score,
      company_values_score,
      ops_score,
      notes,
    } = body;

    // Validate job exists
    const job = await db
      .prepare('SELECT id, status FROM jobs WHERE id = ?')
      .bind(jobId)
      .first<{ id: string; status: string }>();

    if (!job) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 }),
        traceId
      );
    }

    // Scores 0-100
    const scores = {
      client_score: clampScore(client_score),
      adherence_score: clampScore(adherence_score),
      attendance_score: clampScore(attendance_score),
      company_values_score: clampScore(company_values_score),
      ops_score: clampScore(ops_score),
    };

    // Upsert metrics.
    // NOTE (found while migrating cleaner_profiles -> staff, not introduced
    // by that change): job_performance_metrics does not actually have
    // job_id, cleaner_id, client_score or ops_score columns in any
    // migration (011/027 only add staff_id, booking_id and the *_score
    // columns kpi.ts reads) - this INSERT, and its `ON CONFLICT(job_id)`
    // (job_id has no UNIQUE constraint either), already fail against the
    // real schema today, independent of this table-name change. Flagged
    // for a human; not fixed here since it's a job_performance_metrics
    // schema gap, not a cleaner_profiles/staff naming issue.
    await db
      .prepare(
        `INSERT INTO job_performance_metrics (
          job_id, cleaner_id, client_score, adherence_score,
          attendance_score, company_values_score, ops_score, notes, created_at
        )
        SELECT ?, s.id, ?, ?, ?, ?, ?, ?, datetime('now')
        FROM staff s
        JOIN jobs j ON j.id = ?
        WHERE s.user_id = j.supervisor_id
        ON CONFLICT(job_id) DO UPDATE SET
          client_score = excluded.client_score,
          adherence_score = excluded.adherence_score,
          attendance_score = excluded.attendance_score,
          company_values_score = excluded.company_values_score,
          ops_score = excluded.ops_score,
          notes = COALESCE(excluded.notes, notes),
          updated_at = CURRENT_TIMESTAMP`
      )
      .bind(
        jobId,
        scores.client_score,
        scores.adherence_score,
        scores.attendance_score,
        scores.company_values_score,
        scores.ops_score,
        notes || null,
        jobId
      )
      .run();

    // ─── Audit log ───
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        user?.id || 0,
        'qa_review_submitted',
        'job',
        jobId,
        JSON.stringify({ scores, notes, reviewed_by: user?.id, trace_id: traceId })
      )
      .run();

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        message: 'QA review recorded',
        data: { job_id: jobId, scores },
      }),
      traceId
    );
  } catch (error) {
    console.error('QA review error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to submit QA review', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}

function clampScore(val: any): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseInt(val, 10);
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}
