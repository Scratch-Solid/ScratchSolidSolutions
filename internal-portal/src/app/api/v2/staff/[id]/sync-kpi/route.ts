import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';
import { getErpNextCreds } from '@/lib/cleaner-integrations';
import { calculateKpi } from '@/lib/kpi';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = withTracing(request);

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const { id } = await params;
  const staffId = parseInt(id);
  if (isNaN(staffId)) {
    return NextResponse.json({ error: 'Invalid staff ID' }, { status: 400 });
  }

  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const kpi = await calculateKpi(db, staffId);

    // Update ERPNext with KPI data
    try {
      const { baseUrl: erpnextApiUrl, apiKey: erpnextApiKey, apiSecret: erpnextApiSecret } = await getErpNextCreds();

      if (!erpnextApiUrl || !erpnextApiKey || !erpnextApiSecret) {
        console.warn('ERPNext KPI sync skipped: credentials not configured');
      } else {
        const erpnextUrl = `${erpnextApiUrl}/api/resource/Employee/${staffId}`;
        const response = await fetch(erpnextUrl, {
          method: "PUT",
          headers: {
            "Authorization": `token ${erpnextApiKey}:${erpnextApiSecret}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            custom_kpi_score: kpi.kpi5pt,
            custom_client_component: kpi.clientComponent,
            custom_system_component: kpi.systemComponent,
            custom_admin_component: kpi.adminComponent,
            custom_bonus_percentage: kpi.bonusPercentage,
          })
        });

        if (!response.ok) {
          console.error('ERPNext KPI sync failed:', await response.text());
        }
      }
    } catch (erpnextError) {
      console.error('ERPNext KPI sync error:', erpnextError);
      // Continue - local DB update is the primary requirement
    }

    // Update local database (staff_monthly_reviews schema: staff_id, review_month, notes, reviewed_by)
    await db.prepare(`
      INSERT INTO staff_monthly_reviews (staff_id, review_month, notes, reviewed_by, reviewed_at)
      VALUES (?, strftime('%Y-%m', 'now'), ?, 'system', CURRENT_TIMESTAMP)
      ON CONFLICT(staff_id, review_month) DO UPDATE SET
        notes = excluded.notes,
        reviewed_at = CURRENT_TIMESTAMP
    `).bind(staffId, JSON.stringify(kpi)).run();

    return NextResponse.json({
      success: true,
      kpi,
      message: 'KPI synced successfully'
    });
  } catch (error) {
    console.error('KPI sync error:', error);
    return NextResponse.json({ error: `Failed to sync KPI: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
