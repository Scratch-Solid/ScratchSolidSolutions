import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/api/health',
  '/api/status',
  '/api/ping',
  '/api/public',
  '/api/auth/login',
  '/api/auth/cleaner/login',
  '/api/auth/signup',
  '/api/auth/register',
  '/api/signup/cleaner',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/accept-invite',
  '/api/auth/verify-email',
  '/api/auth/send-verification',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/csrf-token',
  '/api/auth/sign-contract',
  '/api/auth/cleaner/setup-password',
  '/api/auth/create-profile',
  '/api/auth/check-onboarding-stage',
  '/api/webhooks',
  '/api/cron',
  '/api/seed',
  '/api/seed-users',
  '/api/test',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                request.cookies.get('auth_token')?.value ||
                request.cookies.get('authToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const traceId = request.headers.get('X-Request-ID') || request.headers.get('X-Trace-ID') || crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', traceId);
  response.headers.set('X-Trace-ID', traceId);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
