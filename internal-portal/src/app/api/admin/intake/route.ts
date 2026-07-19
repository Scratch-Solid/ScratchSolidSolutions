export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

// Proxies to marketing-site, which owns the project-intake data shown in the
// Digital Projects "Incoming requests" queue. Same cross-app pattern as
// /api/admin/projects.
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

// GET /api/admin/intake — every intake request (staff review queue)
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const target = `${apiBase}/api/intake${request.nextUrl.search}`;
  const resp = await proxy(target, { method: 'GET', headers: upstreamHeaders() });
  return withSecurityHeaders(resp, traceId);
}
