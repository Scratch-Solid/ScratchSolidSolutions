import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const staffId = parseInt(params.id);
  if (isNaN(staffId)) {
    return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 });
  }

  try {
    const db = (request as any).db;

    // Fetch historical client scores
    const clientScoresResult = await db.prepare(`
      SELECT client_rating, soft_skill_score, punctuality_score, quality_score, communication_score
      FROM job_performance_metrics
      WHERE staff_id = ?
      ORDER BY recorded_at DESC
      LIMIT 30
    `).bind(staffId).all<{
      client_rating: number;
      soft_skill_score: number;
      punctuality_score: number;
      quality_score: number;
      communication_score: number;
    }>();

    const clientScores = clientScoresResult.results || [];

    // Calculate weighted KPI
    const weightedKPI = calculateWeightedKPI(clientScores);

    // Update ERPNext (placeholder - would need actual ERPNext API call)
    // await updateERPNextKPI(staffId, weightedKPI);

    // Update local database
    await db.prepare(`
      INSERT INTO staff_monthly_reviews (staff_id, review_month, overall_kpi, client_satisfaction_avg, jobs_completed, on_time_percentage, reviewed_by, reviewed_at)
      VALUES (?, strftime('%Y-%m', 'now'), ?, ?, 0, 0, 'system', CURRENT_TIMESTAMP)
      ON CONFLICT(staff_id, review_month) DO UPDATE SET
        overall_kpi = excluded.overall_kpi,
        client_satisfaction_avg = excluded.client_satisfaction_avg,
        reviewed_at = CURRENT_TIMESTAMP
    `).bind(
      staffId,
      weightedKPI.overall,
      weightedKPI.clientSatisfaction
    ).run();

    return NextResponse.json({
      success: true,
      kpi: weightedKPI,
      message: 'KPI synced successfully'
    });
  } catch (error) {
    console.error('KPI sync error:', error);
    return NextResponse.json({ error: 'Failed to sync KPI' }, { status: 500 });
  }
}

function calculateWeightedKPI(scores: any[]): { overall: number; clientSatisfaction: number } {
  if (scores.length === 0) {
    return { overall: 0, clientSatisfaction: 0 };
  }

  const clientRatingAvg = scores.reduce((sum, s) => sum + (s.client_rating || 0), 0) / scores.length;
  const softSkillAvg = scores.reduce((sum, s) => sum + (s.soft_skill_score || 0), 0) / scores.length;
  const punctualityAvg = scores.reduce((sum, s) => sum + (s.punctuality_score || 0), 0) / scores.length;
  const qualityAvg = scores.reduce((sum, s) => sum + (s.quality_score || 0), 0) / scores.length;
  const communicationAvg = scores.reduce((sum, s) => sum + (s.communication_score || 0), 0) / scores.length;

  // Weighted formula: 40% client rating, 20% each for soft skills, punctuality, quality, communication
  const overall = (clientRatingAvg * 0.4) + (softSkillAvg * 0.2) + (punctualityAvg * 0.2) + (qualityAvg * 0.1) + (communicationAvg * 0.1);

  return {
    overall: Math.round(overall * 100) / 100,
    clientSatisfaction: Math.round(clientRatingAvg * 100) / 100
  };
}
