export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    // Get login activity statistics
    const dailyLoginsResult = await db.prepare(
      `SELECT DATE(timestamp) as date, COUNT(*) as count
       FROM login_activity
       WHERE success = 1 AND DATE(timestamp) >= DATE('now', '-6 day')
       GROUP BY DATE(timestamp)
       ORDER BY DATE(timestamp) ASC`
    ).all();
    const preDashboardLogins = await db.prepare(
      "SELECT COUNT(*) as count FROM login_activity WHERE stage = 'pre_dashboard' AND success = 1"
    ).first();

    const cleanerDashboardLogins = await db.prepare(
      "SELECT COUNT(*) as count FROM login_activity WHERE stage = 'cleaner_dashboard' AND success = 1"
    ).first();

    const adminDashboardLogins = await db.prepare(
      "SELECT COUNT(*) as count FROM login_activity WHERE stage = 'admin_dashboard' AND success = 1"
    ).first();

    const failedLogins = await db.prepare(
      'SELECT COUNT(*) as count FROM login_activity WHERE success = 0'
    ).first();
    const dailyLogins = ((dailyLoginsResult.results || []) as Array<Record<string, unknown>>).map((day) => ({
      date: String(day.date || ''),
      count: Number(day.count || 0),
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        pre_dashboard_logins: (preDashboardLogins as any)?.count || 0,
        cleaner_dashboard_logins: (cleanerDashboardLogins as any)?.count || 0,
        admin_dashboard_logins: (adminDashboardLogins as any)?.count || 0,
        failed_logins: (failedLogins as any)?.count || 0,
        daily_logins: dailyLogins
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=300');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Login activity fetch error:', error);
    log.error('Failed to fetch login activity data', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch login activity data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
