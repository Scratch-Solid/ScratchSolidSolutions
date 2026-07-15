import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { calculateKpi } from '@/lib/kpi';
import { getErpNextCreds } from '@/lib/cleaner-integrations';

export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { user, db } = auth;

  try {
    // Accept explicit staffId query param (cleaner dashboard passes user_id)
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId') ? parseInt(searchParams.get('staffId')!) : user.id;

    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const kpi = await calculateKpi(db, staffId);

    // Most recently finalized annual summary, if one has been calculated
    const currentYear = new Date().getFullYear();
    const annual = await db.prepare(`
      SELECT year, avg_monthly_kpi, kpi_score_5pt, bonus_percentage, increase_percentage
      FROM kpi_annual_summary
      WHERE cleaner_id = ? AND year IN (?, ?)
      ORDER BY year DESC
      LIMIT 1
    `).bind(staffId, currentYear, currentYear - 1).first<{
      year: number; avg_monthly_kpi: number; kpi_score_5pt: number; bonus_percentage: number; increase_percentage: number;
    }>();

    // Estimated bonus amount, using the live-computed (not-yet-finalized) KPI
    // against the cleaner's current ERPNext salary - clearly an estimate, not
    // a guaranteed payout figure until the annual summary is finalized.
    let estimatedBonusAmount: number | null = null;
    try {
      const { baseUrl, apiKey, apiSecret } = await getErpNextCreds();
      if (baseUrl && apiKey && apiSecret) {
        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/resource/Salary Slip?filters=[["employee","=","${staffId}"]]&fields=["gross_pay"]&limit_page_length=1&order_by=creation desc`, {
          headers: { Authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}` },
        });
        if (res.ok) {
          const data = await res.json() as { data?: { gross_pay?: number }[] };
          const grossPay = data.data?.[0]?.gross_pay;
          if (typeof grossPay === 'number') {
            estimatedBonusAmount = Math.round(grossPay * (kpi.bonusPercentage / 100) * 100) / 100;
          }
        }
      }
    } catch {
      // Salary preview is best-effort - KPI numbers still return without it
    }

    const payload = {
      // Flat fields kept for any existing consumers reading the old shape
      averageScore: kpi.overall10pt,
      punctuality: kpi.systemComponent,
      quality: kpi.adminComponent,
      clientRating: kpi.clientComponent,
      lastUpdated: new Date().toISOString(),

      // New KPI/bonus breakdown
      kpi: {
        clientComponent: kpi.clientComponent,
        systemComponent: kpi.systemComponent,
        adminComponent: kpi.adminComponent,
        kpi5pt: kpi.kpi5pt,
        kpi5ptRounded: kpi.kpi5ptRounded,
        bonusPercentage: kpi.bonusPercentage,
        increasePercentage: kpi.increasePercentage,
      },
      annualSummary: annual ? {
        year: annual.year,
        avgMonthlyKpi: annual.avg_monthly_kpi,
        kpi5pt: annual.kpi_score_5pt,
        bonusPercentage: annual.bonus_percentage,
        increasePercentage: annual.increase_percentage,
      } : null,
      estimatedBonusAmount,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('KPI score error:', error);
    return NextResponse.json({ error: `Failed to fetch KPI score: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
