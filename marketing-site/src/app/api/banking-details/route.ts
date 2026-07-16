export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

const INTERNAL_PORTAL_URL = process.env.INTERNAL_PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

// Proxies to internal-portal's public banking-details endpoint (the real,
// admin-managed banking_details table) for the EFT payment step. This used
// to read from a local banking_details table that never existed in this
// app's own database - the route always 500'd. Unmasked deliberately: a
// client needs the full account number/branch code to actually complete an
// EFT transfer, not a partially-hidden display value.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const response = await fetch(`${INTERNAL_PORTAL_URL}/api/public/banking-details`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      logger.error('Internal portal banking-details error', new Error(`status ${response.status}`));
      return withSecurityHeaders(NextResponse.json({ error: 'Failed to fetch banking details' }, { status: response.status }), traceId);
    }

    const data = await response.json();
    return withSecurityHeaders(NextResponse.json(data), traceId);
  } catch (error) {
    logger.error('Banking details proxy error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch banking details: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
