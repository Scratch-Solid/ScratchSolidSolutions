export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://scratchsolidsolutions.org';

function upstreamHeaders(request: NextRequest) {
  const headers: Record<string, string> = {};
  const auth = request.headers.get('authorization');
  if (auth) headers['authorization'] = auth;
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  return headers;
}

async function proxy(request: NextRequest, url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.text();
  const contentType = response.headers.get('content-type') || 'application/json';
  return new NextResponse(body, { status: response.status, headers: { 'content-type': contentType } });
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const target = `${apiBase}/api/ai-responses${request.nextUrl.search}`;
  const resp = await proxy(request, target, { method: 'GET', headers: upstreamHeaders(request) });
  return withSecurityHeaders(resp, traceId);
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const body = await request.json();
  const target = `${apiBase}/api/ai-responses`;
  const resp = await proxy(request, target, {
    method: 'POST',
    headers: upstreamHeaders(request),
    body: JSON.stringify(body),
  });
  return withSecurityHeaders(resp, traceId);
}
