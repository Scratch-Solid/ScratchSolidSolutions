export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

// Proxies to marketing-site, which owns the service_areas table (it's the
// data consumed by the booking form's area dropdown) - same cross-app
// pattern as /api/marketing/content.
const apiBase = process.env.MARKETING_SITE_URL || 'https://scratchsolidsolutions.org';

function upstreamHeaders() {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const serviceToken = process.env.MARKETING_SERVICE_TOKEN;
  if (serviceToken) headers['x-service-token'] = serviceToken;
  return headers;
}

async function proxy(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.text();
  return new NextResponse(body, { status: response.status, headers: { 'content-type': 'application/json' } });
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const resp = await proxy(`${apiBase}/api/areas`, { method: 'GET', headers: upstreamHeaders() });
  return withSecurityHeaders(resp, traceId);
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const body = await request.json();
  const resp = await proxy(`${apiBase}/api/areas`, {
    method: 'POST',
    headers: upstreamHeaders(),
    body: JSON.stringify(body),
  });
  return withSecurityHeaders(resp, traceId);
}

export async function DELETE(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const target = `${apiBase}/api/areas${request.nextUrl.search}`;
  const resp = await proxy(target, { method: 'DELETE', headers: upstreamHeaders() });
  return withSecurityHeaders(resp, traceId);
}
