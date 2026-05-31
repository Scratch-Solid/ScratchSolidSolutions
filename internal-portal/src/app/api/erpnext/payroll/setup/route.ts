export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const body = await request.json() as {
      employee_id?: string;
      paysheet_code?: string;
      bank_name?: string;
      account_number?: string;
      branch_code?: string;
      account_holder?: string;
      tax_number?: string;
    };

    const { employee_id, paysheet_code, bank_name, account_number, branch_code, account_holder, tax_number } = body;

    if (!employee_id || !paysheet_code || !bank_name || !account_number) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: { required: ['employee_id', 'paysheet_code', 'bank_name', 'account_number'] }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // TODO: Integrate with ERPNext API to setup payroll
    // For now, return placeholder response
    const response = NextResponse.json({
      success: true,
      message: 'ERPNext payroll setup endpoint - API integration pending',
      data: {
        employee_id,
        paysheet_code,
        status: 'pending_integration'
      }
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('ERPNext payroll setup error:', error);
    log.error('Failed to setup ERPNext payroll', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to setup payroll',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
