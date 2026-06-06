export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing, withCsrf } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    // Generate daily health report
    const report = {
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers: 0,
        activeUsers: 0,
        totalStaff: 0,
        trainedStaff: 0,
        totalNotifications: 0,
        failedNotifications: 0,
        stuckApplicants: 0,
      },
      alerts: [] as any[],
      metrics: {
        conversionRate: 0 as any,
        trainingRate: 0 as any,
        notificationFailureRate: 0 as any,
      },
    };

    // Get user statistics
    const totalUsersResult = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    const activeUsersResult = await db.prepare("SELECT COUNT(*) as count FROM users WHERE onboarding_stage = 'active'").first();
    report.summary.totalUsers = (totalUsersResult as any)?.count || 0;
    report.summary.activeUsers = (activeUsersResult as any)?.count || 0;

    // Get staff statistics
    const totalStaffResult = await db.prepare('SELECT COUNT(*) as count FROM staff').first();
    const trainedStaffResult = await db.prepare("SELECT COUNT(*) as count FROM staff WHERE is_trained = 1").first();
    report.summary.totalStaff = (totalStaffResult as any)?.count || 0;
    report.summary.trainedStaff = (trainedStaffResult as any)?.count || 0;

    // Get notification statistics (last 24 hours)
    const notificationStats = await db.prepare(`
      SELECT status, COUNT(*) as count
      FROM notification_log
      WHERE created_at >= datetime('now', '-24 hours')
      GROUP BY status
    `).all();

    const notificationResults = notificationStats.results || [];
    const sentCount = Number(notificationResults.find((r: any) => r.status === 'sent')?.count || 0);
    const failedCount = Number(notificationResults.find((r: any) => r.status === 'failed')?.count || 0);
    report.summary.totalNotifications = sentCount + failedCount;
    report.summary.failedNotifications = failedCount;

    // Calculate metrics
    report.metrics.conversionRate = report.summary.totalUsers > 0 
      ? (report.summary.activeUsers / report.summary.totalUsers * 100).toFixed(1)
      : 0;
    report.metrics.trainingRate = report.summary.totalStaff > 0
      ? (report.summary.trainedStaff / report.summary.totalStaff * 100).toFixed(1)
      : 0;
    report.metrics.notificationFailureRate = report.summary.totalNotifications > 0
      ? (report.summary.failedNotifications / report.summary.totalNotifications * 100).toFixed(1)
      : 0;

    // Get stuck applicants
    const stuckQuery = await db.prepare(`
      SELECT onboarding_stage as stage, COUNT(*) as count
      FROM users
      WHERE onboarding_stage IS NOT NULL
        AND onboarding_stage != 'active'
        AND onboarding_stage != 'rejected'
        AND created_at < datetime('now', '-7 days')
      GROUP BY onboarding_stage
    `).all();

    const stuckApplicants = stuckQuery.results || [];
    stuckApplicants.forEach((row: any) => {
      report.summary.stuckApplicants += row.count;
      report.alerts.push({
        type: 'stuck_applicants',
        severity: 'warning',
        message: `${row.count} applicants stuck in ${row.stage} stage for > 7 days`,
        stage: row.stage,
        count: row.count
      });
    });

    // Check for critical alerts
    if (parseFloat(report.metrics.notificationFailureRate) > 10) {
      report.alerts.push({
        type: 'notification_failure_high',
        severity: 'critical',
        message: `Notification failure rate is ${report.metrics.notificationFailureRate}% (> 10%)`,
        failureRate: report.metrics.notificationFailureRate
      });
    }

    // TODO: Send email to admin with report
    // This would integrate with an email service like Resend
    // For now, return the report data

    return withSecurityHeaders(NextResponse.json({ 
      success: true,
      report 
    }), traceId);
  } catch (error) {
    console.error('Health report generation error:', error);
    return withSecurityHeaders(NextResponse.json({ error: 'Failed to generate health report' }, { status: 500 }), traceId);
  }
}
