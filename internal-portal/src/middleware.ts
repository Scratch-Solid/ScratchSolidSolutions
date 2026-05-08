import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API endpoints
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For page routes, check auth token
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                request.cookies.get('authToken')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Add trace ID
  const traceId = request.headers.get('X-Request-ID') || request.headers.get('X-Trace-ID') || crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', traceId);
  response.headers.set('X-Trace-ID', traceId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
