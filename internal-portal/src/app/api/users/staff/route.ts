export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { parsePaginationParams, calculatePagination } from '@/lib/pagination';
import { getCloudflareContext } from '@/lib/runtime-context';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams({
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });
    const department = searchParams.get('department');

    // Check if ERPNext credentials are configured
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const erpnextUrl = (env as any)?.ERPNEXT_API_URL || process.env.ERPNEXT_API_URL;
    const erpnextApiKey = (env as any)?.ERPNEXT_API_KEY || process.env.ERPNEXT_API_KEY;
    const erpnextApiSecret = (env as any)?.ERPNEXT_API_SECRET || process.env.ERPNEXT_API_SECRET;

    if (!erpnextUrl || !erpnextApiKey || !erpnextApiSecret) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'ERPNext API credentials not configured',
          details: {
            missing_credentials: [
              !erpnextUrl ? 'ERPNEXT_API_URL' : null,
              !erpnextApiKey ? 'ERPNEXT_API_KEY' : null,
              !erpnextApiSecret ? 'ERPNEXT_API_SECRET' : null
            ].filter(Boolean)
          },
          suggestion: 'Please configure ERPNext API credentials in environment variables'
        }
      }, { status: 503 });
      return withSecurityHeaders(response, traceId);
    }

    // Fetch employees from ERPNext
    let employeesUrl = `${erpnextUrl}/api/resource/Employee`;
    const filters: any[] = [];
    
    if (department) {
      filters.push(['department', '=', department]);
    }

    if (filters.length > 0) {
      employeesUrl += `?filters=${encodeURIComponent(JSON.stringify(filters))}`;
    }

    employeesUrl += filters.length > 0 ? '&' : '?';
    employeesUrl += `limit_page_length=${limit}&limit_start_record=${(page - 1) * limit}`;

    const employeesResponse = await fetch(employeesUrl, {
      headers: {
        'Authorization': `token ${erpnextApiKey}:${erpnextApiSecret}`,
        'Content-Type': 'application/json'
      }
    });

    if (!employeesResponse.ok) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'EXTERNAL_API_ERROR',
          message: 'Failed to fetch staff from ERPNext',
          details: {
            status: employeesResponse.status
          },
          suggestion: 'Please check ERPNext API access and try again'
        }
      }, { status: 502 });
      return withSecurityHeaders(response, traceId);
    }

    const employeesData = await employeesResponse.json();
    const total = employeesData.data?.length || 0;
    const pagination = calculatePagination(page, limit, total);

    const response = NextResponse.json({
      success: true,
      data: {
        staff: employeesData.data || [],
        pagination
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('ERPNext staff fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch staff from ERPNext',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
