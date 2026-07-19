export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

// South African BCEA minimums used as defaults when no balance row exists
// yet for the current cycle - admin can adjust individual allocations later.
// Annual leave: 21 consecutive days (business convention here: 15 working
// days/year). Sick leave: 30 days per a 36-month cycle, not per calendar year.
const DEFAULT_ANNUAL_DAYS = 15;
const DEFAULT_SICK_DAYS = 30;
const SICK_CYCLE_MONTHS = 36;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'digital', 'admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const userId = (user as any)?.user_id || user?.id;

  try {
    const currentYear = new Date().getFullYear();

    let existing = await db.prepare(
      `SELECT * FROM leave_balances WHERE user_id = ? AND year = ? ORDER BY leave_type`
    ).bind(userId, currentYear).all();

    // First time this staff member has looked at leave balances this year -
    // provision default annual/sick allocations rather than showing nothing.
    if (!existing.results || existing.results.length === 0) {
      const now = new Date();
      const annualCycleStart = `${currentYear}-01-01`;
      const annualCycleEnd = `${currentYear}-12-31`;
      const sickCycleStart = now.toISOString().split('T')[0];
      const sickCycleEnd = addMonths(now, SICK_CYCLE_MONTHS).toISOString().split('T')[0];

      await db.batch([
        db.prepare(
          `INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, remaining_days, year, cycle_start_date, cycle_end_date)
           VALUES (?, 'annual', ?, 0, ?, ?, ?, ?)`
        ).bind(userId, DEFAULT_ANNUAL_DAYS, DEFAULT_ANNUAL_DAYS, currentYear, annualCycleStart, annualCycleEnd),
        db.prepare(
          `INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, remaining_days, year, cycle_start_date, cycle_end_date)
           VALUES (?, 'sick', ?, 0, ?, ?, ?, ?)`
        ).bind(userId, DEFAULT_SICK_DAYS, DEFAULT_SICK_DAYS, currentYear, sickCycleStart, sickCycleEnd),
      ]);

      existing = await db.prepare(
        `SELECT * FROM leave_balances WHERE user_id = ? AND year = ? ORDER BY leave_type`
      ).bind(userId, currentYear).all();
    }

    const response = NextResponse.json({ data: existing.results || [] });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to fetch leave balance: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
