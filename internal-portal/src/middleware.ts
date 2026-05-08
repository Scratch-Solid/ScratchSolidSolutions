import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/api/health', '/api/status', '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/test', '/api/content/', '/auth/login', '/auth/signup', '/auth/employee-consent', '/auth/contract', '/auth/sign-contract', '/auth/create-profile', '/auth/consent-submitted'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                request.cookies.get('authToken')?.value;

  if (!token) {
    // For page routes, redirect to login
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    // For API routes, return 401
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Add trace ID if not present
  const traceId = request.headers.get('X-Request-ID') || request.headers.get('X-Trace-ID') || crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', traceId);
  response.headers.set('X-Trace-ID', traceId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
