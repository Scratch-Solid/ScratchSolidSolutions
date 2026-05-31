export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { parsePaginationParams, calculatePagination } from '@/lib/pagination';

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
    const status = searchParams.get('status');

    // Check if Zoho credentials are configured
    const zohoClientId = process.env.ZOHO_CLIENT_ID;
    const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET;
    const zohoOrgId = process.env.ZOHO_ORG_ID;
    const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN;

    if (!zohoClientId || !zohoClientSecret || !zohoOrgId || !zohoRefreshToken) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Zoho Books API credentials not configured',
          details: {
            missing_credentials: [
              !zohoClientId ? 'ZOHO_CLIENT_ID' : null,
              !zohoClientSecret ? 'ZOHO_CLIENT_SECRET' : null,
              !zohoOrgId ? 'ZOHO_ORG_ID' : null,
              !zohoRefreshToken ? 'ZOHO_REFRESH_TOKEN' : null
            ].filter(Boolean)
          },
          suggestion: 'Please configure Zoho Books API credentials in environment variables'
        }
      }, { status: 503 });
      return withSecurityHeaders(response, traceId);
    }

    // Get access token using refresh token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: zohoRefreshToken,
        client_id: zohoClientId,
        client_secret: zohoClientSecret,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenResponse.ok) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'EXTERNAL_API_ERROR',
          message: 'Failed to obtain Zoho access token',
          details: {
            status: tokenResponse.status
          },
          suggestion: 'Please check Zoho Books API credentials and try again'
        }
      }, { status: 502 });
      return withSecurityHeaders(response, traceId);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch payments from Zoho Books
    let paymentsUrl = `https://books.zoho.com/api/v3/customerpayments?organization_id=${zohoOrgId}`;
    paymentsUrl += `&per_page=${limit}&page=${page}`;
    if (status) {
      paymentsUrl += `&status=${status}`;
    }

    const paymentsResponse = await fetch(paymentsUrl, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paymentsResponse.ok) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'EXTERNAL_API_ERROR',
          message: 'Failed to fetch payments from Zoho Books',
          details: {
            status: paymentsResponse.status
          },
          suggestion: 'Please check Zoho Books API access and try again'
        }
      }, { status: 502 });
      return withSecurityHeaders(response, traceId);
    }

    const paymentsData = await paymentsResponse.json() as { customerpayments?: any[]; page_context?: { total?: number } };
    const total = paymentsData.page_context?.total || 0;
    const pagination = calculatePagination(page, limit, total);

    const response = NextResponse.json({
      success: true,
      data: {
        payments: paymentsData.customerpayments || [],
        pagination
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Zoho payments fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch payments from Zoho Books',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
