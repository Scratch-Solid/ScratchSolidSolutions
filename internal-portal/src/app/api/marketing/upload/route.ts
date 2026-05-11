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

async function proxy(request: NextRequest, url: string) {
  const headers = upstreamHeaders(request);
  let body: BodyInit | undefined;

  if (request.method === 'POST' || request.method === 'PUT') {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const jsonBody = await request.json();
      body = JSON.stringify(jsonBody);
    } else {
      body = request.body;
    }
  }

  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
  });
  const responseBody = await res.text();
  const responseContentType = res.headers.get('content-type') || 'application/json';
  return new NextResponse(responseBody, { status: res.status, headers: { 'content-type': responseContentType } });
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);

  const target = `${apiBase}/api/upload`;
  const resp = await proxy(request, target);
  return withSecurityHeaders(resp, traceId);
}
