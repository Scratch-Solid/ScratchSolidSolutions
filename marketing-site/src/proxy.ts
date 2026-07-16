import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/api/health',
  '/api/status',
  '/api/csrf-token',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/resend-verification',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/content',
  '/api/pricing',
  '/api/reviews',
  '/api/cleaners',
  '/api/cleaner-details',
  '/api/services',
  '/api/service-pricing',
  '/api/areas',
  '/api/promo-codes',
  '/api/quote',
  '/api/chatbot',
  '/api/about-content',
  '/api/public',
  '/api/analytics/track',
  '/api/feedback',
  '/api/webhooks',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths - allow access without auth
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only enforce auth on API routes that aren't public
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For API routes that require auth, check for token (Bearer header or the
  // httpOnly access cookie set by the login/refresh endpoints).
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                request.cookies.get('client_auth_token')?.value ||
                request.cookies.get('authToken')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Add trace ID if not present
  const traceId = request.headers.get('X-Request-ID') || request.headers.get('X-Trace-ID') || crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', traceId);
  response.headers.set('X-Trace-ID', traceId);

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://api.scratchsolidsolutions.org https://api-staging.scratchsolidsolutions.org https://uploads.scratchsolidsolutions.org https://uploads-staging.scratchsolidsolutions.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
