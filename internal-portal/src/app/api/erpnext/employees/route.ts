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

    const { employee_id, first_name, last_name, email, phone, department, position, date_of_birth, gender, marital_status } = body;

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

    // TODO: Integrate with ERPNext API to create employee
    // For now, return placeholder response
    const response = NextResponse.json({
      success: true,
      message: 'ERPNext employee creation endpoint - API integration pending',
      data: {
        employee_id,
        status: 'pending_integration'
      }
    });
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
