import { NextRequest, NextResponse } from 'next/server';
import { checkAuthAndRole } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { getCloudflareContext } from '@/lib/runtime-context';

export async function GET(request: NextRequest) {
  const auth = await checkAuthAndRole(request);
  if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const staffId = auth.user.id;

    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const erpnextApiUrl = (env as any)?.ERPNEXT_API_URL || process.env.ERPNEXT_API_URL;
    const erpnextApiKey = (env as any)?.ERPNEXT_API_KEY || process.env.ERPNEXT_API_KEY;
    const erpnextApiSecret = (env as any)?.ERPNEXT_API_SECRET || process.env.ERPNEXT_API_SECRET;

    if (!erpnextApiUrl || !erpnextApiKey || !erpnextApiSecret) {
      return NextResponse.json({
        message: 'ERPNext integration pending - salary preview not available until ERPNext is configured'
      }, { status: 503 });
    }

    const erpnextUrl = `${erpnextApiUrl}/api/resource/Salary Slip?fields=["gross_pay","total_deductions","net_pay","start_date","end_date"]&filters=[["employee","=",${staffId}],["docstatus","=","Submitted"]]&order_by=creation desc&limit=1`;

    const response = await fetch(erpnextUrl, {
      method: "GET",
      headers: {
        "Authorization": `token ${erpnextApiKey}:${erpnextApiSecret}`
      }
    });

    const payrollData = await response.json() as { data?: any[]; message?: string };

    if (!payrollData.data || payrollData.data.length === 0) {
      return NextResponse.json({ 
        message: payrollData.message || "Current payroll ledger compilation is pending administrative configuration." 
      }, { status: 404 });
    }

    const payload = {
      grossEarnings: payrollData.data[0].gross_pay,
      uifDeductions: payrollData.data[0].total_deductions,
      takeHomePay: payrollData.data[0].net_pay,
      payPeriod: {
        startDate: payrollData.data[0].start_date,
        endDate: payrollData.data[0].end_date
      },
      currency: "ZAR",
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Salary preview error:', error);
    return NextResponse.json({ error: 'Failed to fetch salary preview' }, { status: 500 });
  }
}
