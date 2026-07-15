export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimits } from '@/lib/middleware';
import { getCloudflareContext } from '@/lib/runtime-context';

let accessToken = '';
let tokenExpiry = 0;
let apiDomain = '';

async function getZohoCreds() {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
  const dc = ((env as any)?.ZOHO_DC || process.env.ZOHO_DC || 'com').replace(/^\./, '');
  return {
    orgId: (env as any)?.ZOHO_ORG_ID || process.env.ZOHO_ORG_ID || '',
    clientId: (env as any)?.ZOHO_CLIENT_ID || process.env.ZOHO_CLIENT_ID || '',
    clientSecret: (env as any)?.ZOHO_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET || '',
    refreshToken: (env as any)?.ZOHO_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN || '',
    dc,
  };
}

function booksBase(dc: string): string {
  const domain = apiDomain || `https://www.zohoapis.${dc}`;
  return `${domain}/books/v3`;
}

async function getZohoToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const creds = await getZohoCreds();
  if (!creds.refreshToken || !creds.clientId || !creds.clientSecret) {
    throw new Error('Zoho credentials not configured');
  }
  const response = await fetch(`https://accounts.zoho.${creds.dc}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: creds.refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'refresh_token'
    }),
  });
  const json = await response.json() as { access_token?: string; expires_in?: number; api_domain?: string; error?: string };
  if (!json.access_token) {
    throw new Error('Zoho authentication failed: ' + JSON.stringify(json));
  }
  accessToken = json.access_token;
  if (json.api_domain) apiDomain = json.api_domain;
  tokenExpiry = Date.now() + ((json.expires_in || 3600) * 1000) - 60000;
  return accessToken;
}

async function zohoRequest(endpoint: string, method: string, body?: any) {
  const token = await getZohoToken();
  const creds = await getZohoCreds();
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      'X-com-zoho-books-organizationid': creds.orgId
    }
  };
  if (body) options.body = JSON.stringify(body);
  return fetch(`${booksBase(creds.dc)}${endpoint}`, options);
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
  const sessionCustomerId = `CUST-${(user as any).user_id}`;
  const requestedCustomerId = searchParams.get('customer_id');
  const customerId = sessionRole === 'admin' ? (requestedCustomerId || sessionCustomerId) : sessionCustomerId;

  const creds = await getZohoCreds();
  if (!creds.refreshToken || !creds.orgId) {
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
