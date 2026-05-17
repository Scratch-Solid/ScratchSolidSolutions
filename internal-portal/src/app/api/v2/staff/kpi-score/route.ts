import { NextRequest, NextResponse } from 'next/server';
import { checkAuthAndRole } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await checkAuthAndRole(request);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Accept explicit staffId query param (cleaner dashboard passes user_id)
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId') ? parseInt(searchParams.get('staffId')!) : auth.user.id;

    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const result = await db.prepare(`
      SELECT 
        AVG(adherence_score)          AS average_kpi,
        AVG(client_rating)            AS client_rating_avg,
        COUNT(*)                      AS total_reviews,
        AVG(adherence_score)          AS punctuality_avg,
        AVG(adherence_score)          AS quality_avg,
        AVG(adherence_score)          AS communication_avg,
        AVG(adherence_score)          AS adherence_avg
      FROM job_performance_metrics
      WHERE staff_id = ?
    `).bind(String(staffId)).first<{
      average_kpi: number;
      client_rating_avg: number;
      total_reviews: number;
      punctuality_avg: number;
      quality_avg: number;
      communication_avg: number;
      adherence_avg: number;
    }>();

    // Return flat structure matching CleanerDashboard expectations
    const payload = {
      averageScore:   result?.average_kpi    ?? 0,
      totalReviews:   result?.total_reviews  ?? 0,
      punctuality:    result?.punctuality_avg ?? 0,
      quality:        result?.quality_avg     ?? 0,
      communication:  result?.communication_avg ?? 0,
      adherence:      result?.adherence_avg   ?? 0,
      clientRating:   result?.client_rating_avg ?? 0,
      lastUpdated:    new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('KPI score error:', error);
    return NextResponse.json({ error: 'Failed to fetch KPI score' }, { status: 500 });
  }
}
