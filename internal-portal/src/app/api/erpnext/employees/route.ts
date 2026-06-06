export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { registerCleanerInErpNext } from '@/lib/cleaner-integrations';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const userId = authResult.user?.id;

  try {
    const body = await request.json() as {
      employee_id?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      department?: string;
      position?: string;
      date_of_birth?: string;
      gender?: string;
      marital_status?: string;
    };

    const { employee_id, first_name, last_name, email, phone, department, position } = body;

    if (!employee_id || !first_name || !last_name || !email) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: { required: ['employee_id', 'first_name', 'last_name', 'email'] }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await registerCleanerInErpNext({
      traceId,
      employeeId: employee_id,
      firstName: first_name,
      lastName: last_name,
      email,
      phone: phone || '',
      department: department || 'cleaning',
      position: position || 'Cleaner',
    });

    const response = NextResponse.json({
      success: result.status === 'configured',
      message: result.status === 'configured' ? 'Employee created in ERPNext' : 'ERPNext integration pending',
      data: {
        employee_id,
        erpnext_reference: result.reference,
        status: result.status,
        reason: result.reason,
      }
    }, { status: result.status === 'configured' ? 201 : 503 });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('ERPNext employee creation error:', error);
    log.error('Failed to create ERPNext employee', error instanceof Error ? error : new Error(String(error)), { traceId, userId });

    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create employee',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
