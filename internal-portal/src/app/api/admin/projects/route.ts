export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

// Proxies to marketing-site, which owns the projects/phases/milestones data
// shown on the client-facing Digital dashboard. Same cross-app pattern as
// /api/admin/services and /api/admin/areas.
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

// GET /api/admin/projects — every Digital project (staff list view)
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const target = `${apiBase}/api/projects${request.nextUrl.search}`;
  const resp = await proxy(target, { method: 'GET', headers: upstreamHeaders() });
  return withSecurityHeaders(resp, traceId);
}

// POST /api/admin/projects — create a project for a client (by email)
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const body = await request.json();
  const resp = await proxy(`${apiBase}/api/projects`, {
    method: 'POST',
    headers: upstreamHeaders(),
    body: JSON.stringify(body),
  });
  return withSecurityHeaders(resp, traceId);
}
