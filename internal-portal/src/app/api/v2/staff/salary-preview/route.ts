import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getErpNextCreds } from '@/lib/cleaner-integrations';

export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const staffId = user.id;

    const { baseUrl: erpnextApiUrl, apiKey: erpnextApiKey, apiSecret: erpnextApiSecret } = await getErpNextCreds();

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
