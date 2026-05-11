export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '../../../lib/middleware';

function getPayrollPeriod(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Payroll cycle: 28th of previous month to 27th of current month
  const start = new Date(year, month - 1, 28);
  const end = new Date(year, month, 27);
  
  return { start, end };
}

function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleaner_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!cleanerId) {
      return NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 });
    }

    // Get cleaner profile with rates
    const cleaner = await db.prepare(
      'SELECT * FROM cleaner_profiles WHERE user_id = ?'
    ).bind(cleanerId).first();

    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
    }

    const weekdayRate = (cleaner as any).weekday_rate || 150;
    const weekendRate = (cleaner as any).weekend_rate || 225;
    const deductions = (cleaner as any).deductions || 0;

    // Determine payroll period
    const now = year && month ? new Date(parseInt(year), parseInt(month) - 1, 1) : new Date();
    const { start, end } = getPayrollPeriod(now);

    // Get task completions within the period
    const taskCompletions = await db.prepare(
      `SELECT tc.*, b.booking_date 
       FROM task_completions tc
       JOIN bookings b ON tc.booking_id = b.id
       WHERE tc.cleaner_id = ? 
       AND tc.completed_at >= ? 
       AND tc.completed_at <= ?
       ORDER BY tc.completed_at DESC`
    ).bind(cleanerId, start.toISOString(), end.toISOString()).all();

    const tasks = (taskCompletions.results || []).map((task: any) => {
      const isWeekendJob = isWeekend(task.booking_date);
      const rate = isWeekendJob ? weekendRate : weekdayRate;
      return {
        ...task,
        rate,
        isWeekend: isWeekendJob
      };
    });

    // Calculate totals
    const weekdayEarnings = tasks.filter((t: any) => !t.isWeekend).reduce((sum: number, t: any) => sum + t.rate, 0);
    const weekendEarnings = tasks.filter((t: any) => t.isWeekend).reduce((sum: number, t: any) => sum + t.rate, 0);
    const grossEarnings = weekdayEarnings + weekendEarnings;
    const netEarnings = grossEarnings - deductions;

    return NextResponse.json({
      cleanerId,
      cleanerName: `${(cleaner as any).first_name} ${(cleaner as any).last_name}`,
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      rates: {
        weekday: weekdayRate,
        weekend: weekendRate
      },
      deductions,
      tasks,
      summary: {
        totalTasks: tasks.length,
        weekdayEarnings,
        weekendEarnings,
        grossEarnings,
        netEarnings
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const { cleaner_id, deductions, weekday_rate, weekend_rate } = body;

    if (!cleaner_id) {
      return NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 });
    }

    // Update cleaner payroll settings
    const updates: string[] = [];
    const values: any[] = [];

    if (deductions !== undefined) {
      updates.push('deductions = ?');
      values.push(deductions);
    }
    if (weekday_rate !== undefined) {
      updates.push('weekday_rate = ?');
      values.push(weekday_rate);
    }
    if (weekend_rate !== undefined) {
      updates.push('weekend_rate = ?');
      values.push(weekend_rate);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime("now")');
    values.push(cleaner_id);

    await db.prepare(
      `UPDATE cleaner_profiles SET ${updates.join(', ')} WHERE user_id = ?`
    ).bind(...values).run();

    return NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update payroll settings' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { cleaner_id, paysheet_code, period_start, period_end, hours_worked, hourly_rate, gross_pay, deductions, net_pay } = await request.json();
    
    if (!cleaner_id || !period_start || !period_end || !gross_pay || !net_pay) {
      return NextResponse.json({ error: 'Missing required fields: cleaner_id, period_start, period_end, gross_pay, net_pay' }, { status: 400 });
    }
    
    const result = await db.prepare(
      'INSERT INTO payroll (cleaner_id, paysheet_code, period_start, period_end, hours_worked, hourly_rate, gross_pay, deductions, net_pay, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", datetime("now")) RETURNING *'
    ).bind(cleaner_id, paysheet_code || null, period_start, period_end, hours_worked || 0, hourly_rate || 0, gross_pay, deductions || 0, net_pay).first();
    
    return NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create payroll record' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
