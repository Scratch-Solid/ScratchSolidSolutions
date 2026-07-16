export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

const INTERNAL_PORTAL_URL = process.env.INTERNAL_PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

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

    // Forward request to internal portal
    const internalUrl = `${INTERNAL_PORTAL_URL}/api/cleaner-status?cleaner_id=${cleanerId}`;
    
    const response = await fetch(internalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward the authorization token from the current session
        'Authorization': `Bearer ${(user as any).token || request.headers.get('authorization')?.replace('Bearer ', '')}`
      },
      cache: 'no-store'
    });

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
