export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { isValidServiceToken, withTracing } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const tokenValid = await isValidServiceToken(request);

  let expectedPrefix: string | null = null;
  try {
    const { env } = await import('@/lib/runtime-context').then(m => m.getCloudflareContext({ async: true }));
    const expected = (env as any)?.MARKETING_SERVICE_TOKEN;
    expectedPrefix = expected ? expected.slice(0, 8) : null;
  } catch {
    const expected = process.env.MARKETING_SERVICE_TOKEN;
    expectedPrefix = expected ? expected.slice(0, 8) : null;
  }

  return NextResponse.json(
    {
      valid: tokenValid,
      source: tokenValid ? 'x-service-token' : null,
      configured: !!expectedPrefix,
      expectedPrefix,
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { 'x-trace-id': traceId } }
  );
}
