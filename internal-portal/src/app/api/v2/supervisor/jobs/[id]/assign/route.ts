export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * POST /api/v2/supervisor/jobs/[id]/assign
 * Assign cleaners (paysheet_codes) to a job and set supervisor.
 * Auth: supervisor or admin
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
  const { id } = await params;
    const jobId = id;
    const body = (await request.json()) as unknown;

    if (
      typeof body !== 'object' ||
      body === null ||
      !('cleaner_ids' in body) ||
      !Array.isArray((body as any).cleaner_ids)
    ) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Missing cleaner_ids array' },
          { status: 400 }
        ),
        traceId
      );
    }

    const { cleaner_ids } = body as { cleaner_ids: string[] };

    // Validate cleaners exist
    const placeholders = cleaner_ids.map(() => '?').join(',');
    const cleanerCheck = await db
      .prepare(`SELECT paysheet_code FROM cleaner_profiles WHERE paysheet_code IN (${placeholders})`)
      .bind(...cleaner_ids)
      .all<{ paysheet_code: string }>();

    const foundCodes = new Set((cleanerCheck.results || []).map((c) => c.paysheet_code));
    const missing = cleaner_ids.filter((id) => !foundCodes.has(id));

    if (missing.length > 0) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Invalid cleaner IDs', missing },
          { status: 400 }
        ),
        traceId
      );
    }

    // ─── Update job ───
    await db
      .prepare(
        `UPDATE jobs
         SET supervisor_id = ?, team_members = ?, status = 'assigned', updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(userId, JSON.stringify(cleaner_ids), jobId)
      .run();

    // ─── Audit log ───
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        userId,
        'job_assigned',
        'job',
        jobId,
        JSON.stringify({
          supervisor_id: userId,
          cleaner_ids,
          trace_id: traceId,
        })
      )
      .run();

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        message: 'Job assigned successfully',
        data: {
          job_id: jobId,
          supervisor_id: userId,
          cleaner_ids,
          status: 'assigned',
        },
      }),
      traceId
    );
  } catch (error) {
    console.error('Job assignment error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to assign job', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
