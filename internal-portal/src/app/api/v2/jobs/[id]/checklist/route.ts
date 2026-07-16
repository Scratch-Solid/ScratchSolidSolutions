export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * GET /api/v2/jobs/[id]/checklist
 * Fetch checklist items for a job.
 *
 * POST /api/v2/jobs/[id]/checklist
 * Mark checklist items complete (cleaner) or reset them (supervisor).
 * Body: { checklist_item_id: number, is_completed: boolean, photo_url?: string }
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

    const items = await db
      .prepare(
        `SELECT
          jc.id,
          jc.room_name,
          jc.task_description,
          jc.is_completed,
          jc.completed_by,
          jc.completed_at,
          jc.photo_url
        FROM job_checklists jc
        WHERE jc.job_id = ?
        ORDER BY jc.room_name, jc.id`
      )
      .bind(jobId)
      .all<any>();

    // Group by room
    const grouped = (items.results || []).reduce((acc: any, item: any) => {
      if (!acc[item.room_name]) acc[item.room_name] = [];
      acc[item.room_name].push(item);
      return acc;
    }, {});

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: grouped,
        flat: items.results || [],
      }),
      traceId
    );
  } catch (error) {
    console.error('Checklist fetch error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to fetch checklist', traceId },
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
    const { checklist_item_id, is_completed, photo_url } = body;

    if (!checklist_item_id || typeof is_completed !== 'boolean') {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Missing checklist_item_id or is_completed' },
          { status: 400 }
        ),
        traceId
      );
    }

    // Verify item belongs to this job
    const item = await db
      .prepare('SELECT job_id FROM job_checklists WHERE id = ?')
      .bind(checklist_item_id)
      .first<{ job_id: string }>();

    if (!item || item.job_id !== jobId) {
      return withSecurityHeaders(
        NextResponse.json(
          { success: false, error: 'Checklist item not found for this job' },
          { status: 404 }
        ),
        traceId
      );
    }

    const completedBy = is_completed ? (user?.paysheet_code || user?.name || 'unknown') : null;

    await db
      .prepare(
        `UPDATE job_checklists
         SET is_completed = ?, completed_by = ?, completed_at = ?, photo_url = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        is_completed ? 1 : 0,
        completedBy,
        is_completed ? new Date().toISOString() : null,
        photo_url || null,
        checklist_item_id
      )
      .run();

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        message: is_completed ? 'Item marked complete' : 'Item reset',
        data: { checklist_item_id, is_completed, completed_by: completedBy },
      }),
      traceId
    );
  } catch (error) {
    console.error('Checklist update error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to update checklist', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
