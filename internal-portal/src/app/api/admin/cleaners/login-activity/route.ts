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
    const preDashboardLogins = await db.prepare(
      "SELECT COUNT(*) as count FROM login_activity WHERE stage = 'pre_dashboard' AND success = 1"
    ).first();

    const cleanerDashboardLogins = await db.prepare(
      "SELECT COUNT(*) as count FROM login_activity WHERE stage = 'cleaner_dashboard' AND success = 1"
    ).first();

    const failedLogins = await db.prepare(
      'SELECT COUNT(*) as count FROM login_activity WHERE success = 0'
    ).first();

    const response = NextResponse.json({
      success: true,
      data: {
        pre_dashboard_logins: (preDashboardLogins as any)?.count || 0,
        cleaner_dashboard_logins: (cleanerDashboardLogins as any)?.count || 0,
        failed_logins: (failedLogins as any)?.count || 0
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
        message: 'Failed to fetch login activity data',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
