import { NextRequest, NextResponse } from 'next/server';
import { checkAuthAndRole } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const auth = await checkAuthAndRole(request);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const staffId = auth.user.id;
    const db = (request as any).db;

    const result = await db.prepare(`
      SELECT 
        AVG(overall_score) as average_kpi,
        COUNT(*) as total_reviews,
        AVG(punctuality_score) as punctuality_avg,
        AVG(quality_score) as quality_avg,
        AVG(communication_score) as communication_avg
      FROM job_performance_metrics
      WHERE staff_id = ?
    `).bind(staffId).first<{
      average_kpi: number;
      total_reviews: number;
      punctuality_avg: number;
      quality_avg: number;
      communication_avg: number;
    }>();

    if (!result) {
      return NextResponse.json({ 
        message: "No performance metrics found for this staff member" 
      }, { status: 404 });
    }

    const payload = {
      overallKpi: result.average_kpi || 0,
      totalReviews: result.total_reviews || 0,
      breakdown: {
        punctuality: result.punctuality_avg || 0,
        quality: result.quality_avg || 0,
        communication: result.communication_avg || 0
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('KPI score error:', error);
    return NextResponse.json({ error: 'Failed to fetch KPI score' }, { status: 500 });
  }
}
