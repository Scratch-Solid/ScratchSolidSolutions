import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';

const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID!;
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID!;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET!;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN!;

let accessToken = '';
let tokenExpiry = 0;

async function getZohoToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    }),
  });
  const json = await response.json() as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error('Zoho authentication failed: ' + JSON.stringify(json));
  }
  accessToken = json.access_token;
  tokenExpiry = Date.now() + ((json.expires_in || 3600) * 1000) - 60000;
  return accessToken;
}

async function zohoRequest(endpoint: string, method: string, body?: any) {
  const token = await getZohoToken();
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      'X-com-zoho-books-organizationid': ZOHO_ORG_ID
    }
  };
  if (body) options.body = JSON.stringify(body);
  return fetch(`https://books.zoho.com/api/v3${endpoint}`, options);
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many Zoho financial requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  const { searchParams } = new URL(request.url);
  const sessionRole: string = (user as any).role;
  const sessionCustomerId = `CUST-${(user as any).id}`;
  const requestedCustomerId = searchParams.get('customer_id');
  const customerId = sessionRole === 'admin' ? (requestedCustomerId || sessionCustomerId) : sessionCustomerId;

  if (!ZOHO_REFRESH_TOKEN || !ZOHO_ORG_ID) {
    const response = NextResponse.json({ error: 'Zoho not configured' }, { status: 503 });
    return withSecurityHeaders(response, traceId);
  }

  try {
    const [statementsRes, invoicesRes] = await Promise.all([
      zohoRequest(`/customerstatements?customer_id=${customerId || ''}`, 'GET'),
      zohoRequest(`/invoices?customer_id=${customerId || ''}&status=unpaid,sent`, 'GET')
    ]);

    const statements = await statementsRes.json();
    const invoices = await invoicesRes.json();

    const response = NextResponse.json({
      statements: (statements as any).customerstatements || [],
      invoices: (invoices as any).invoices || []
    });
    return withSecurityHeaders(response, traceId);
  } catch (error: any) {
    logger.error('Zoho API error', error as Error);
    const response = NextResponse.json({ error: 'Zoho integration unavailable' }, { status: 502 });
    return withSecurityHeaders(response, traceId);
  }
}
