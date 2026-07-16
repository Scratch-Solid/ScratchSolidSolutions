import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';
import { bonusPercentageForKpi } from '@/lib/kpi';
import { getErpNextCreds } from '@/lib/cleaner-integrations';

/**
 * Finalizes the annual KPI/bonus figure for every active cleaner, run once a
 * year (Feb, per the admin's bonus/increase cycle). Averages that year's
 * monthly staff_monthly_reviews.overall_score values into kpi_annual_summary
 * - the source of truth the cleaner dashboard and ERPNext payroll read from.
 *
 * Body: { year?: number } - defaults to the current year.
 */
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json().catch(() => ({})) as { year?: number };
    const year = body.year || new Date().getFullYear();

    const cleaners = await db.prepare(`
      SELECT cp.user_id
      FROM cleaner_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.deleted = 0
    `).all<{ user_id: number }>();

    const results: { cleanerId: number; monthsReviewed: number; kpi5pt: number; bonusPercentage: number }[] = [];

    for (const { user_id: cleanerId } of cleaners.results || []) {
      const monthly = await db.prepare(`
        SELECT notes FROM staff_monthly_reviews
        WHERE staff_id = ? AND review_month LIKE ?
      `).bind(cleanerId, `${year}-%`).all<{ notes: string }>();

      const rows = monthly.results || [];
      if (rows.length === 0) continue;

      const overallScores: number[] = [];
      for (const row of rows) {
        try {
          const parsed = JSON.parse(row.notes || '{}');
          if (typeof parsed.overall10pt === 'number') overallScores.push(parsed.overall10pt);
        } catch {
          // Older rows may not have valid JSON notes - skip rather than fail the whole run
        }
      }
      if (overallScores.length === 0) continue;

      const avgOverall10pt = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
      const kpi5pt = Math.round((avgOverall10pt / 2) * 100) / 100;
      const kpi5ptRounded = Math.max(1, Math.min(5, Math.round(kpi5pt)));
      const bonusPercentage = bonusPercentageForKpi(kpi5ptRounded);

      await db.prepare(`
        INSERT INTO kpi_annual_summary
          (cleaner_id, year, months_reviewed, avg_monthly_kpi, kpi_score_5pt, bonus_percentage, increase_percentage, calculated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(cleaner_id, year) DO UPDATE SET
          months_reviewed = excluded.months_reviewed,
          avg_monthly_kpi = excluded.avg_monthly_kpi,
          kpi_score_5pt = excluded.kpi_score_5pt,
          bonus_percentage = excluded.bonus_percentage,
          increase_percentage = excluded.increase_percentage,
          calculated_at = datetime('now')
      `).bind(cleanerId, year, overallScores.length, avgOverall10pt, kpi5pt, bonusPercentage, bonusPercentage).run();

      // Best-effort ERPNext push - a failure here shouldn't block finalizing
      // the other cleaners' summaries.
      try {
        const { baseUrl, apiKey, apiSecret } = await getErpNextCreds();
        if (baseUrl && apiKey && apiSecret) {
          await fetch(`${baseUrl.replace(/\/$/, '')}/api/resource/Employee/${cleanerId}`, {
            method: 'PUT',
            headers: {
              Authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              custom_annual_kpi_score: kpi5pt,
              custom_annual_bonus_percentage: bonusPercentage,
              custom_annual_increase_percentage: bonusPercentage,
            }),
          });
          await db.prepare(
            `UPDATE kpi_annual_summary SET synced_to_erpnext_at = datetime('now') WHERE cleaner_id = ? AND year = ?`
          ).bind(cleanerId, year).run();
        }
      } catch (erpError) {
        console.warn(`ERPNext annual KPI sync failed for cleaner ${cleanerId}:`, erpError);
      }

      results.push({ cleanerId, monthsReviewed: overallScores.length, kpi5pt, bonusPercentage });
    }

    return NextResponse.json({ success: true, year, cleanersProcessed: results.length, results });
  } catch (error) {
    console.error('Annual KPI calculation error:', error);
    return NextResponse.json({ error: `Failed to calculate annual KPI: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
