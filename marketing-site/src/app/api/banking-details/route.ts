export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { getCloudflareContext } from '@/lib/runtime-context';

// Proxies to internal-portal's public banking-details endpoint (the real,
// admin-managed banking_details table) for the EFT payment step. This used
// to read from a local banking_details table that never existed in this
// app's own database - the route always 500'd. Unmasked deliberately: a
// client needs the full account number/branch code to actually complete an
// EFT transfer, not a partially-hidden display value.
//
// Uses the PORTAL service binding (Worker-to-Worker RPC) rather than a plain
// fetch() to the public hostname - same-zone Worker-to-Worker calls over the
// public network were unreliable (522s).
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const portal = env?.PORTAL;
    if (!portal) {
      logger.error('PORTAL service binding not available', new Error('missing binding'));
      return withSecurityHeaders(NextResponse.json({ error: 'Internal portal unavailable' }, { status: 503 }), traceId);
    }

    const response = await portal.fetch('https://internal-portal/api/public/banking-details', {
      method: 'GET',
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
