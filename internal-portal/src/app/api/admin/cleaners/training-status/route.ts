export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withSecurityHeaders, withTracing } from '@/lib/middleware';
import { CLEANER_TRAINING_MODULES } from '@/lib/cleaner-training';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const rows = await db.prepare(`
      SELECT
        u.id AS user_id,
        u.name,
        s.paysheet_code,
        tp.modules_completed,
        tp.completion_percentage,
        tp.completed
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN training_progress tp ON s.paysheet_code = tp.employee_id
      WHERE s.department = 'cleaning'
      ORDER BY u.name
    `).all();

    const moduleTitleById = new Map(CLEANER_TRAINING_MODULES.map((m) => [m.id, m.title]));

    const learners = (rows.results || []).map((row: any) => {
      let modulesCompleted: string[] = [];
      try {
        modulesCompleted = JSON.parse(row.modules_completed || '[]');
      } catch {
        modulesCompleted = [];
      }
      return {
        user_id: row.user_id,
        name: row.name,
        paysheet_code: row.paysheet_code,
        completion_percentage: row.completion_percentage || 0,
        completed: row.completed === 1,
        modules_completed: modulesCompleted.map((id) => moduleTitleById.get(id) || id),
      };
    });

    return withSecurityHeaders(NextResponse.json({ learners }), traceId);
  } catch (error) {
    console.error('Training status fetch error:', error);
    return withSecurityHeaders(NextResponse.json({ error: `Failed to fetch training status: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
