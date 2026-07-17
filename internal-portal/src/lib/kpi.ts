/**
 * KPI formula (per the admin's spec):
 *   Client (50%)  = avg cleaning_feedback.rating (real customer ratings, 1-5) scaled to 0-10
 *   System (25%)  = avg job_performance_metrics.adherence_score (real GPS-based
 *                    punctuality, computed automatically in cleaner-status/route.ts)
 *   Admin (25%)   = avg of attendance_score, company_values_score, quality_score,
 *                    communication_score (the admin's monthly review inputs)
 *   Overall (0-10) = client*0.5 + system*0.25 + admin*0.25
 *   KPI (0-5)      = Overall / 2
 *   Bonus %        = 5->100, 4->80, 3->60, 2->40, 1->20 (looked up from the
 *                     rounded KPI, since the bonus tiers are discrete, not
 *                     interpolated)
 */

export interface KpiResult {
  clientComponent: number;   // 0-10
  systemComponent: number;   // 0-10
  adminComponent: number;    // 0-10
  overall10pt: number;       // 0-10, weighted 50/25/25
  kpi5pt: number;            // 0-5, precise (for display)
  kpi5ptRounded: number;     // 1-5, whole number (for the bonus table lookup)
  bonusPercentage: number;
  increasePercentage: number;
}

const BONUS_TABLE: Record<number, number> = { 5: 100, 4: 80, 3: 60, 2: 40, 1: 20 };

export function bonusPercentageForKpi(kpi5ptRounded: number): number {
  return BONUS_TABLE[Math.max(1, Math.min(5, kpi5ptRounded))];
}

export async function calculateKpi(db: D1Database, staffId: number): Promise<KpiResult> {
  // Admin component: the last 30 admin-submitted review metrics for this cleaner
  // (LIMIT must apply before AVG(), so the recent-30 slice is a subquery -
  // AVG(...) ... LIMIT 30 with no subquery aggregates the entire table first
  // and only then applies LIMIT to the single resulting row, a no-op).
  const adminRow = await db.prepare(`
    SELECT AVG(attendance_score)    AS attendance,
           AVG(company_values_score) AS company_values,
           AVG(quality_score)        AS quality,
           AVG(communication_score)  AS communication
    FROM (
      SELECT attendance_score, company_values_score, quality_score, communication_score
      FROM job_performance_metrics
      WHERE staff_id = ?
      ORDER BY recorded_at DESC
      LIMIT 30
    )
  `).bind(String(staffId)).first<{ attendance: number; company_values: number; quality: number; communication: number }>();

  const adminComponent = average([adminRow?.attendance, adminRow?.company_values, adminRow?.quality, adminRow?.communication]);

  // System component: real GPS-based punctuality, computed automatically on arrival
  const systemRow = await db.prepare(`
    SELECT AVG(adherence_score) AS adherence
    FROM (
      SELECT adherence_score
      FROM job_performance_metrics
      WHERE staff_id = ?
      ORDER BY recorded_at DESC
      LIMIT 30
    )
  `).bind(String(staffId)).first<{ adherence: number }>();

  const systemComponent = systemRow?.adherence ?? 0;

  // Client component: real customer ratings, via cleaner_profiles (cleaning_feedback.cleaner_id
  // references cleaner_profiles.id, not users.id - staffId here is a users.id)
  const clientRow = await db.prepare(`
    SELECT AVG(rating) AS avg_rating
    FROM (
      SELECT cf.rating
      FROM cleaning_feedback cf
      JOIN cleaner_profiles cp ON cf.cleaner_id = cp.id
      WHERE cp.user_id = ?
      ORDER BY cf.created_at DESC
      LIMIT 30
    )
  `).bind(staffId).first<{ avg_rating: number }>();

  const clientComponent = clientRow?.avg_rating ? (clientRow.avg_rating / 5) * 10 : 0;

  const overall10pt = clientComponent * 0.5 + systemComponent * 0.25 + adminComponent * 0.25;
  const kpi5pt = overall10pt / 2;
  const kpi5ptRounded = Math.max(1, Math.min(5, Math.round(kpi5pt)));
  const bonusPercentage = bonusPercentageForKpi(kpi5ptRounded);

  return {
    clientComponent: round2(clientComponent),
    systemComponent: round2(systemComponent),
    adminComponent: round2(adminComponent),
    overall10pt: round2(overall10pt),
    kpi5pt: round2(kpi5pt),
    kpi5ptRounded,
    bonusPercentage,
    increasePercentage: bonusPercentage, // same tiered table per the admin's spec
  };
}

function average(values: (number | null | undefined)[]): number {
  const nums = values.filter((v): v is number => typeof v === 'number');
  if (nums.length === 0) return 0;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
