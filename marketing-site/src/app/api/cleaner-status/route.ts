export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { getCloudflareContext } from '@/lib/runtime-context';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleaner_id');

    if (!cleanerId) {
      return withSecurityHeaders(NextResponse.json({ error: 'cleaner_id required' }, { status: 400 }), traceId);
    }

    // Forward to internal-portal via the PORTAL service binding (Worker-to-Worker
    // RPC) rather than a plain fetch() to the public hostname - same-zone
    // Worker-to-Worker calls over the public network were unreliable (522s).
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const portal = env?.PORTAL;
    if (!portal) {
      logger.error('PORTAL service binding not available', new Error('missing binding'));
      return withSecurityHeaders(NextResponse.json({ error: 'Internal portal unavailable' }, { status: 503 }), traceId);
    }

    const response = await portal.fetch(
      `https://internal-portal/api/cleaner-status?cleaner_id=${cleanerId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(user as any).token || request.headers.get('authorization')?.replace('Bearer ', '')}`
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Internal portal cleaner-status error', new Error(errorText));
      return withSecurityHeaders(
        NextResponse.json({ error: 'Failed to fetch cleaner status from internal portal' }, { status: response.status }),
        traceId
      );
    }

    const data = await response.json();
    return withSecurityHeaders(NextResponse.json(data), traceId);
  } catch (error) {
    logger.error('Cleaner status proxy error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch cleaner status: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
