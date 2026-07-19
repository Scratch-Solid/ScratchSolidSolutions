export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { CLEANER_RATE_PER_TASK } from '@/lib/pay-rates';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Native, ERPNext-independent payslips. Cleaners are paid per completed
// task (grouped by calendar month); other staff (e.g. digital) are paid
// from the existing hourly payroll table. This route previously called
// ERPNext's Salary Slip resource, which is an hrms doctype not installed on
// this site - it always returned empty, and its response shape
// ({data:{payslips:[...]}}) didn't even match what CleanerDashboard.tsx
// reads (payslip.period/pay_date/net_pay), so the payslips tile would have
// thrown trying to .map() over that wrapper object.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'digital', 'admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const userId = (user as any)?.user_id || user?.id;
  const role = (user as any)?.role;

  try {
    if (role === 'cleaner') {
      const result = await db.prepare(
        `SELECT completed_at FROM booking_assignments WHERE staff_id = ? AND assignment_status = 'completed' AND completed_at IS NOT NULL`
      ).bind(userId).all();

      const byMonth = new Map<string, number>();
      for (const row of (result.results || []) as any[]) {
        const monthKey = String(row.completed_at).slice(0, 7); // YYYY-MM
        byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + 1);
      }

      const currentMonthKey = new Date().toISOString().slice(0, 7);
      const payslips = Array.from(byMonth.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([monthKey, taskCount]) => {
          const [year, month] = monthKey.split('-').map(Number);
          const grossPay = taskCount * CLEANER_RATE_PER_TASK;
          const isCurrentMonth = monthKey === currentMonthKey;
          const lastDayOfMonth = new Date(year, month, 0).getDate();
          return {
            id: monthKey,
            period: `${MONTH_NAMES[month - 1]} ${year}`,
            pay_date: isCurrentMonth ? null : `${monthKey}-${String(lastDayOfMonth).padStart(2, '0')}`,
            task_count: taskCount,
            rate_per_task: CLEANER_RATE_PER_TASK,
            gross_pay: grossPay,
            deductions: 0,
            net_pay: grossPay,
            status: isCurrentMonth ? 'accruing' : 'final',
          };
        });

      const response = NextResponse.json({ data: payslips });
      response.headers.set('Cache-Control', 'private, max-age=60');
      return withSecurityHeaders(response, traceId);
    }

    // Non-cleaner staff (digital, etc.) - the payroll table is scoped to
    // cleaner_profiles, so staff without a cleaner profile (e.g. digital
    // team) genuinely have no payslip data yet - there's no separate
    // salaried-staff payroll system built. Returns empty rather than
    // fabricating figures.
    const cleanerProfile = await db.prepare(`SELECT id FROM cleaner_profiles WHERE user_id = ?`).bind(userId).first() as { id: number } | null;
    if (!cleanerProfile) {
      const response = NextResponse.json({ data: [], message: 'No payroll records available for this role yet' });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `SELECT id, period_start, period_end, hours_worked, hourly_rate, gross_pay, deductions, net_pay, status
       FROM payroll WHERE cleaner_id = ? ORDER BY period_start DESC`
    ).bind(cleanerProfile.id).all();

    const payslips = (result.results || []).map((row: any) => ({
      id: row.id,
      period: `${row.period_start} to ${row.period_end}`,
      pay_date: row.period_end,
      hours_worked: row.hours_worked,
      hourly_rate: row.hourly_rate,
      gross_pay: row.gross_pay,
      deductions: row.deductions,
      net_pay: row.net_pay,
      status: row.status,
    }));

    const response = NextResponse.json({ data: payslips });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch payslips: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
