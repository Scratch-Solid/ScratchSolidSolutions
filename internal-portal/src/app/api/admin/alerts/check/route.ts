export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing, withCsrf } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const alerts: any[] = [];

    // Alert 1: Stuck applicants (users in same stage > 7 days)
    const stuckQuery = await db.prepare(`
      SELECT 
        onboarding_stage as stage,
        COUNT(*) as count
      FROM users
      WHERE onboarding_stage IS NOT NULL
        AND onboarding_stage != 'active'
        AND onboarding_stage != 'rejected'
        AND created_at < datetime('now', '-7 days')
      GROUP BY onboarding_stage
    `).all();

    const stuckApplicants = stuckQuery.results || [];
    stuckApplicants.forEach((row: any) => {
      if (row.count > 0) {
        alerts.push({
          type: 'stuck_applicants',
          severity: 'warning',
          message: `${row.count} applicants stuck in ${row.stage} stage for > 7 days`,
          stage: row.stage,
          count: row.count
        });
      }
    });

    // Alert 2: Conversion rate drop (compare to last 30 days)
    const currentActive = await db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE onboarding_stage = 'active'
        AND created_at >= datetime('now', '-30 days')
    `).first();

    const previousActive = await db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE onboarding_stage = 'active'
        AND created_at >= datetime('now', '-60 days')
        AND created_at < datetime('now', '-30 days')
    `).first();

    const currentCount = (currentActive as any)?.count || 0;
    const previousCount = (previousActive as any)?.count || 0;
    const totalCurrent = await db.prepare(`SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-30 days')`).first();
    const totalPrevious = await db.prepare(`SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days')`).first();

    const currentRate = (totalCurrent as any)?.count > 0 ? (currentCount / (totalCurrent as any).count) * 100 : 0;
    const previousRate = (totalPrevious as any)?.count > 0 ? (previousCount / (totalPrevious as any).count) * 100 : 0;

    if (previousRate > 0 && currentRate < previousRate * 0.8) {
      alerts.push({
        type: 'conversion_rate_drop',
        severity: 'critical',
        message: `Conversion rate dropped from ${previousRate.toFixed(1)}% to ${currentRate.toFixed(1)}%`,
        currentRate,
        previousRate
      });
    }

    // Alert 3: Training rate drop
    const currentTrained = await db.prepare(`
      SELECT COUNT(*) as count
      FROM staff
      WHERE is_trained = 1
        AND created_at >= datetime('now', '-30 days')
    `).first();

    const previousTrained = await db.prepare(`
      SELECT COUNT(*) as count
      FROM staff
      WHERE is_trained = 1
        AND created_at >= datetime('now', '-60 days')
        AND created_at < datetime('now', '-30 days')
    `).first();

    const currentTrainedCount = (currentTrained as any)?.count || 0;
    const previousTrainedCount = (previousTrained as any)?.count || 0;
    const totalStaffCurrent = await db.prepare(`SELECT COUNT(*) as count FROM staff WHERE created_at >= datetime('now', '-30 days')`).first();
    const totalStaffPrevious = await db.prepare(`SELECT COUNT(*) as count FROM staff WHERE created_at >= datetime('now', '-60 days') AND created_at < datetime('now', '-30 days')`).first();

    const currentTrainingRate = (totalStaffCurrent as any)?.count > 0 ? (currentTrainedCount / (totalStaffCurrent as any).count) * 100 : 0;
    const previousTrainingRate = (totalStaffPrevious as any)?.count > 0 ? (previousTrainedCount / (totalStaffPrevious as any).count) * 100 : 0;

    if (previousTrainingRate > 0 && currentTrainingRate < previousTrainingRate * 0.8) {
      alerts.push({
        type: 'training_rate_drop',
        severity: 'warning',
        message: `Training completion rate dropped from ${previousTrainingRate.toFixed(1)}% to ${currentTrainingRate.toFixed(1)}%`,
        currentRate: currentTrainingRate,
        previousRate: previousTrainingRate
      });
    }

    // Alert 4: Notification failure rate > 10%
    const notificationStats = await db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM notification_log
      WHERE created_at >= datetime('now', '-24 hours')
      GROUP BY status
    `).all();

    const notificationResults = notificationStats.results || [];
    const sentCount = notificationResults.find((r: any) => r.status === 'sent')?.count || 0;
    const failedCount = notificationResults.find((r: any) => r.status === 'failed')?.count || 0;
    const totalNotifications = sentCount + failedCount;

    if (totalNotifications > 0) {
      const failureRate = (failedCount / totalNotifications) * 100;
      if (failureRate > 10) {
        alerts.push({
          type: 'notification_failure_high',
          severity: 'critical',
          message: `Notification failure rate is ${failureRate.toFixed(1)}% (> 10%)`,
          failureRate,
          failedCount,
          totalNotifications
        });
      }
    }

    // Alert 5: Stage duration > 7 days (from onboarding_audit)
    const longStages = await db.prepare(`
      SELECT 
        to_stage as stage,
        COUNT(*) as count
      FROM onboarding_audit
      WHERE created_at < datetime('now', '-7 days')
        AND to_stage != 'active'
        AND to_stage != 'rejected'
        AND user_id NOT IN (
          SELECT user_id FROM onboarding_audit 
          WHERE to_stage = 'active' 
          OR to_stage = 'rejected'
        )
      GROUP BY to_stage
    `).all();

    const longStageResults = longStages.results || [];
    longStageResults.forEach((row: any) => {
      if (row.count > 0) {
        alerts.push({
          type: 'stage_duration_long',
          severity: 'warning',
          message: `${row.count} users in ${row.stage} stage for > 7 days`,
          stage: row.stage,
          count: row.count
        });
      }
    });

    // Alert 6: Database connectivity (check from health status)
    try {
      await db.prepare('SELECT 1').first();
    } catch (error) {
      alerts.push({
        type: 'db_connectivity_failure',
        severity: 'critical',
        message: 'Database connectivity check failed',
        error: String(error)
      });
    }

    return withSecurityHeaders(NextResponse.json({ alerts }), traceId);
  } catch (error) {
    console.error('Alert check error:', error);
    return withSecurityHeaders(NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 }), traceId);
  }
}
