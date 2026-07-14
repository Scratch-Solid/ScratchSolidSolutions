export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';
import { getErpNextCreds } from '@/lib/cleaner-integrations';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    // Get cleaner profile
    const cleanerProfile = await db.prepare(
      'SELECT cp.paysheet_code FROM cleaner_profiles cp WHERE cp.user_id = ?'
    ).bind(userId).first();

    if (!cleanerProfile) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cleaner profile not found',
          suggestion: 'Please contact support'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const cleaner = cleanerProfile as any;
    const paysheetCode = cleaner.paysheet_code;

    // Read ERPNext credentials from centralized helper
    const { baseUrl: erpnextApiUrl, apiKey: erpnextApiKey, apiSecret: erpnextApiSecret } = await getErpNextCreds();

    if (!erpnextApiUrl || !erpnextApiKey || !erpnextApiSecret) {
      const response = NextResponse.json({
        success: true,
        data: {
          payslips: [],
          message: 'ERPNext integration pending - payslips will be available after setup'
        }
      });
      response.headers.set('Cache-Control', 'private, max-age=300');
      return withSecurityHeaders(response, traceId);
    }

    // Fetch payslips from ERPNext
    const fields = '["name","start_date","end_date","gross_pay","total_deductions","net_pay","status","posting_date"]';
    const erpnextUrl = `${erpnextApiUrl}/api/resource/Salary Slip?fields=${encodeURIComponent(fields)}&filters=${encodeURIComponent(`[["employee","=","${paysheetCode}"]]`)}&order_by=posting_date desc&limit=50`;

    const erpResponse = await fetch(erpnextUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${erpnextApiKey}:${erpnextApiSecret}`,
        'Accept': 'application/json'
      }
    });

    if (!erpResponse.ok) {
      const text = await erpResponse.text().catch(() => 'Unknown error');
      log.error('ERPNext payslips fetch failed', new Error(`HTTP ${erpResponse.status}: ${text}`), { traceId, userId, paysheetCode });
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'ERPNext_ERROR',
          message: 'Failed to retrieve payslips from ERPNext',
          suggestion: 'Please try again later or contact support'
        }
      }, { status: 502 });
      return withSecurityHeaders(response, traceId);
    }

    const erpData = await erpResponse.json() as { data?: any[] };
    const payslips = (erpData.data || []).map((slip: any) => ({
      id: slip.name,
      periodStart: slip.start_date,
      periodEnd: slip.end_date,
      postedDate: slip.posting_date,
      grossPay: slip.gross_pay,
      totalDeductions: slip.total_deductions,
      netPay: slip.net_pay,
      status: slip.status,
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        payslips,
        count: payslips.length,
        message: payslips.length === 0 ? 'No payslips found for your account' : undefined
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=300');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Payslips fetch error:', error);
    log.error('Failed to fetch payslips', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch payslips: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
