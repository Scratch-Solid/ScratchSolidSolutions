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
    // Get funnel data - count of users at each stage
    const funnelQuery = await db.prepare(`
      SELECT 
        onboarding_stage as stage,
        COUNT(*) as count
      FROM users
      WHERE onboarding_stage IS NOT NULL
      GROUP BY onboarding_stage
      ORDER BY 
        CASE onboarding_stage
          WHEN 'consent_pending' THEN 1
          WHEN 'consent_approved' THEN 2
          WHEN 'profile_created' THEN 3
          WHEN 'contract_signed' THEN 4
          WHEN 'training_in_progress' THEN 5
          WHEN 'active' THEN 6
          WHEN 'rejected' THEN 7
        END
    `).all();

    const funnelResults = funnelQuery.results || [];
    const totalCount = funnelResults.reduce((sum: number, item: any) => sum + item.count, 0);

    const funnel = funnelResults.map((item: any) => ({
      stage: item.stage,
      count: item.count,
      percentage: totalCount > 0 ? (item.count / totalCount) * 100 : 0
    }));

    // Get stage duration analysis
    const stageDurationQuery = await db.prepare(`
      SELECT 
        from_stage as stage,
        AVG(
          CASE 
            WHEN to_stage = 'consent_approved' THEN 
              (julianday(MAX(created_at)) - julianday(MIN(created_at))) * 24
            WHEN to_stage = 'profile_created' THEN 
              (julianday(MAX(created_at)) - julianday(MIN(created_at))) * 24
            WHEN to_stage = 'contract_signed' THEN 
              (julianday(MAX(created_at)) - julianday(MIN(created_at))) * 24
            WHEN to_stage = 'active' THEN 
              (julianday(MAX(created_at)) - julianday(MIN(created_at))) * 24
            ELSE 0
          END
        ) as avg_duration_hours
      FROM onboarding_audit
      WHERE from_stage IS NOT NULL
      GROUP BY from_stage
    `).all();

    const stageDurations = (stageDurationQuery.results || []).map((item: any) => ({
      stage: item.stage,
      avg_duration_hours: item.avg_duration_hours || 0
    }));

    // Get drop-off points - users who didn't progress to next stage
    const dropOffQuery = await db.prepare(`
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

    const dropOffs = (dropOffQuery.results || []).map((item: any) => ({
      stage: item.stage,
      count: item.count
    }));

    // Get department comparison
    const departmentQuery = await db.prepare(`
      SELECT 
        s.department,
        u.onboarding_stage,
        COUNT(*) as count
      FROM users u
      LEFT JOIN staff s ON u.id = s.user_id
      WHERE u.onboarding_stage IS NOT NULL
      GROUP BY s.department, u.onboarding_stage
    `).all();

    const departmentComparison = (departmentQuery.results || []).reduce((acc: any, item: any) => {
      const dept = item.department || 'Unassigned';
      if (!acc[dept]) acc[dept] = {};
      acc[dept][item.onboarding_stage] = item.count;
      return acc;
    }, {});

    // Get time-of-day analysis
    const timeOfDayQuery = await db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as count
      FROM users
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY hour
      ORDER BY hour
    `).all();

    const timeOfDayAnalysis = (timeOfDayQuery.results || []).map((item: any) => ({
      hour: item.hour,
      count: item.count
    }));

    return withSecurityHeaders(NextResponse.json({ funnel, stageDurations, dropOffs, departmentComparison, timeOfDayAnalysis }), traceId);
  } catch (error) {
    console.error('Analytics error:', error);
    return withSecurityHeaders(NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 }), traceId);
  }
}
