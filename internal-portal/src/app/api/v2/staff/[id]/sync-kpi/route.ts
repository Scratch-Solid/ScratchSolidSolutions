import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const staffId = parseInt(params.id);
  if (isNaN(staffId)) {
    return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 });
  }

  try {
    const db = await getDb();

    // Fetch historical client scores
    const clientScoresResult = await db.prepare(`
      SELECT client_rating, adherence_score, punctuality_score, quality_score, communication_score
      FROM job_performance_metrics
      WHERE staff_id = ?
      ORDER BY created_at DESC
      LIMIT 30
    `).bind(String(staffId)).all<{
      client_rating: number;
      adherence_score: number;
      punctuality_score: number;
      quality_score: number;
      communication_score: number;
    }>();

    const clientScores = clientScoresResult.results || [];

    // Calculate weighted KPI
    const weightedKPI = calculateWeightedKPI(clientScores);

    // Update ERPNext (placeholder - would need actual ERPNext API call)
    // await updateERPNextKPI(staffId, weightedKPI);

    // Update local database (staff_monthly_reviews schema: staff_id, review_month, attendance_score, company_values_score, notes, reviewed_by)
    await db.prepare(`
      INSERT INTO staff_monthly_reviews (staff_id, review_month, notes, reviewed_by, reviewed_at)
      VALUES (?, strftime('%Y-%m', 'now'), ?, 'system', CURRENT_TIMESTAMP)
      ON CONFLICT(staff_id, review_month) DO UPDATE SET
        notes = excluded.notes,
        reviewed_at = CURRENT_TIMESTAMP
    `).bind(
      staffId,
      JSON.stringify({ overall_kpi: weightedKPI.overall, client_satisfaction: weightedKPI.clientSatisfaction })
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

/**
 * KPI Formula aligned to specification:
 *   Client Score  = (avg client_rating / 5 * 10)           — scaled to 0-10
 *   Ops Score     = (adherence + punctuality + quality) / 3 — avg of operational 0-10 metrics
 *   Overall KPI   = (clientScore * 0.5) + (opsScore * 0.5)  — 50/50 weighting → 0-10
 *   Displayed as  0-100 (multiply by 10) on the frontend
 */
function calculateWeightedKPI(scores: any[]): { overall: number; clientSatisfaction: number; punctuality: number; quality: number; communication: number } {
  if (scores.length === 0) {
    return { overall: 0, clientSatisfaction: 0, punctuality: 0, quality: 0, communication: 0 };
  }

  const avg = (field: string) =>
    scores.reduce((sum, s) => sum + (s[field] || 0), 0) / scores.length;

  // Client satisfaction: star rating (1-5) normalised to 0-10
  const clientRatingRaw   = avg('client_rating');
  const clientScore       = (clientRatingRaw / 5) * 10;

  // Operational metrics (0-10 scale in DB)
  const adherenceScore    = avg('adherence_score');
  const punctualityScore  = avg('punctuality_score') || adherenceScore; // fallback to adherence if null
  const qualityScore      = avg('quality_score');
  const communicationScore = avg('communication_score');

  // Operational composite = average of the three operational pillars
  const opsScore = (adherenceScore + punctualityScore + qualityScore) / 3;

  // Overall KPI: 50% client, 50% operational
  const overall = (clientScore * 0.5) + (opsScore * 0.5);

  return {
    overall:          Math.round(overall * 100) / 100,
    clientSatisfaction: Math.round(clientScore * 100) / 100,
    punctuality:      Math.round(punctualityScore * 100) / 100,
    quality:          Math.round(qualityScore * 100) / 100,
    communication:    Math.round(communicationScore * 100) / 100,
  };
}
