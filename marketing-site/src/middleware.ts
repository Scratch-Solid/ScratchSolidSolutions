import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/api/health', '/api/status', '/api/auth/login', '/api/auth/signup', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/content/', '/api/pricing', '/api/reviews', '/api/cleaners', '/api/cleaner-details', '/api/test-forgot-password', '/api/test-db'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths - allow access without auth
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only enforce auth on API routes that aren't public
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For API routes that require auth, check for token
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                request.cookies.get('authToken')?.value;

  if (!token) {
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
  matcher: '/api/:path*',
};
