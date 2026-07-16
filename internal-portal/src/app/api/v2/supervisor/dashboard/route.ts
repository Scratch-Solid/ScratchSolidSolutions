export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * GET /api/v2/supervisor/dashboard
 * KPIs and summary for a supervisor's daily operations.
 * Auth: supervisor or admin
 */

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const today = new Date().toISOString().split('T')[0];

    // ─── Jobs summary ───
    const jobsSummary = await db
      .prepare(
        `
        SELECT
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
          SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN payment_status != 'paid' THEN 1 ELSE 0 END) as unpaid
        FROM jobs
        WHERE date(scheduled_at) = ?
        ${userId ? 'AND (supervisor_id = ? OR supervisor_id IS NULL)' : ''}
        `
      )
      .bind(...(userId ? [today, userId] : [today]))
      .first<{
        total_jobs: number;
        scheduled: number;
        assigned: number;
        in_progress: number;
        completed: number;
        cancelled: number;
        paid: number;
        unpaid: number;
      }>();

    // ─── Active cleaners ───
    const activeCleaners = await db
      .prepare(
        `
        SELECT COUNT(DISTINCT paysheet_code) as count
        FROM cleaner_profiles
        WHERE status IN ('active', 'idle')
        `
      )
      .first<{ count: number }>();

    // ─── Today's jobs with details ───
    const todaysJobs = await db
      .prepare(
        `
        SELECT
          j.id,
          j.client_name,
          j.property_address,
          j.property_type,
          j.scheduled_at,
          j.status,
          j.team_members,
          j.payment_status
        FROM jobs j
        WHERE date(j.scheduled_at) = ?
        ${userId ? 'AND (j.supervisor_id = ? OR j.supervisor_id IS NULL)' : ''}
        ORDER BY j.scheduled_at ASC
        LIMIT 20
        `
      )
      .bind(...(userId ? [today, userId] : [today]))
      .all<any>();

    const parsedJobs = (todaysJobs.results || []).map((job: any) => ({
      ...job,
      team_members: job.team_members ? JSON.parse(job.team_members) : [],
    }));

    // ─── Overdue checklists ───
    const overdueChecklists = await db
      .prepare(
        `
        SELECT COUNT(*) as count
        FROM job_checklists
        WHERE is_completed = 0
          AND job_id IN (
            SELECT id FROM jobs
            WHERE status = 'in_progress'
            AND date(scheduled_at) = ?
          )
        `
      )
      .bind(today)
      .first<{ count: number }>();

    // ─── Response ───
    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: {
          date: today,
          jobs: {
            total: jobsSummary?.total_jobs || 0,
            scheduled: jobsSummary?.scheduled || 0,
            assigned: jobsSummary?.assigned || 0,
            in_progress: jobsSummary?.in_progress || 0,
            completed: jobsSummary?.completed || 0,
            cancelled: jobsSummary?.cancelled || 0,
            paid: jobsSummary?.paid || 0,
            unpaid: jobsSummary?.unpaid || 0,
          },
          workforce: {
            active_cleaners: activeCleaners?.count || 0,
          },
          quality: {
            overdue_checklists: overdueChecklists?.count || 0,
          },
          todays_jobs: parsedJobs,
        },
      }),
      traceId
    );
  } catch (error) {
    console.error('Supervisor dashboard error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to load dashboard', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
