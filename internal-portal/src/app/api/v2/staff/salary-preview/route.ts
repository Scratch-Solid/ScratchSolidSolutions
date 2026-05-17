import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  const user = await withAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const staffId = user.id;
    const erpnextUrl = `${process.env.ERPNEXT_URL}/api/resource/Salary Slip?fields=["gross_pay","total_deductions","net_pay","start_date","end_date"]&filters=[["employee","=",${staffId}],["docstatus","=","Submitted"]]&order_by=creation desc&limit=1`;

    const response = await fetch(erpnextUrl, {
      method: "GET",
      headers: {
        "Authorization": `token ${process.env.ERPNEXT_API_KEY}:${process.env.ERPNEXT_API_SECRET}`
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
