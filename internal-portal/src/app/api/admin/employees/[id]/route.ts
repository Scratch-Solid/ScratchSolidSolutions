export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { calculateKpi } from '@/lib/kpi';

// GET /api/admin/employees/[id] — full HR oversight view for one employee:
// profile, leave history, KPI, payroll/payslip history, and completed-task
// history, all pulled from data that already exists elsewhere (leave admin,
// v2 staff KPI, admin payroll, booking_assignments) but was never surfaced
// together in one place.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { id } = await params;
    const userId = Number(id);

    const profile = await db.prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.onboarding_stage,
              s.paysheet_code, s.first_name, s.last_name, s.status, s.department
       FROM users u
       LEFT JOIN staff s ON s.user_id = u.id
       WHERE u.id = ?`
    ).bind(userId).first();

    if (!profile) {
      return withSecurityHeaders(NextResponse.json({ error: 'Employee not found' }, { status: 404 }), traceId);
    }

    const [leave, payroll, tasks, kpi] = await Promise.all([
      db.prepare(
        `SELECT id, type, start_date, end_date, days, status, reason, created_at
         FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
      ).bind(userId).all().catch(() => ({ results: [] })),
      db.prepare(
        `SELECT id, period_start, period_end, gross_pay, net_pay, status, created_at
         FROM payroll WHERE cleaner_id = ? ORDER BY created_at DESC LIMIT 20`
      ).bind(userId).all().catch(() => ({ results: [] })),
      db.prepare(
        `SELECT id, booking_id, assignment_date, completed_at
         FROM booking_assignments
         WHERE staff_id = ? AND assignment_status = 'completed' AND completed_at IS NOT NULL
         ORDER BY completed_at DESC LIMIT 30`
      ).bind(userId).all().catch(() => ({ results: [] })),
      calculateKpi(db, userId).catch(() => null),
    ]);

    const response = NextResponse.json({
      profile,
      leave: leave.results || [],
      payroll: payroll.results || [],
      tasksCompleted: tasks.results || [],
      tasksCompletedCount: (tasks.results || []).length,
      kpi,
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch employee detail: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
