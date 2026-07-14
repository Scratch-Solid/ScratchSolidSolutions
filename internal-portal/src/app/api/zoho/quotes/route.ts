export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { parsePaginationParams, calculatePagination } from '@/lib/pagination';
import { getZohoCreds, getZohoToken, booksBase } from '@/lib/zoho';

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
    const creds = await getZohoCreds();

    if (!creds.clientId || !creds.clientSecret || !creds.orgId || !creds.refreshToken) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Zoho Books API credentials not configured',
          details: {
            missing_credentials: [
              !creds.clientId ? 'ZOHO_CLIENT_ID' : null,
              !creds.clientSecret ? 'ZOHO_CLIENT_SECRET' : null,
              !creds.orgId ? 'ZOHO_ORG_ID' : null,
              !creds.refreshToken ? 'ZOHO_REFRESH_TOKEN' : null
            ].filter(Boolean)
          },
          suggestion: 'Please configure Zoho Books API credentials in wrangler secrets'
        }
      }, { status: 503 });
      return withSecurityHeaders(response, traceId);
    }

    // Get access token using refresh token (with caching)
    const accessToken = await getZohoToken();

    // Fetch quotes from Zoho Books
    let quotesUrl = `${booksBase(creds.dc)}/quotes?organization_id=${creds.orgId}`;
    quotesUrl += `&per_page=${limit}&page=${page}`;
    if (status) {
      quotesUrl += `&status=${status}`;
    }

    const quotesResponse = await fetch(quotesUrl, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!quotesResponse.ok) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'EXTERNAL_API_ERROR',
          message: 'Failed to fetch quotes from Zoho Books',
          details: {
            status: quotesResponse.status
          },
          suggestion: 'Please check Zoho Books API access and try again'
        }
      }, { status: 502 });
      return withSecurityHeaders(response, traceId);
    }

    const quotesData = await quotesResponse.json() as { quote?: any[]; page_context?: { total?: number } };
    const total = quotesData.page_context?.total || 0;
    const pagination = calculatePagination(page, limit, total);

    const response = NextResponse.json({
      success: true,
      data: {
        quotes: quotesData.quote || [],
        pagination
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Zoho quotes fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch quotes from Zoho Books: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
