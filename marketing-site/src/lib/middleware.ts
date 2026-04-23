import { NextRequest, NextResponse } from 'next/server';
import { getDb, validateSession } from './db';

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (record.count >= RATE_LIMIT_MAX) return true;
  record.count++;
  return false;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

function generateTraceId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function withTracing(request: NextRequest): string {
  return request.headers.get('X-Request-ID') || request.headers.get('X-Trace-ID') || generateTraceId();
}

export async function withSecurityHeaders(response: NextResponse, traceId: string): Promise<NextResponse> {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://books.zoho.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('X-Request-ID', traceId);
  response.headers.set('X-Trace-ID', traceId);
  return response;
}

export async function withRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  return null;
}

export async function withAuth(request: NextRequest, allowedRoles?: string[]): Promise<{ user: any; db: D1Database } | NextResponse> {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await validateSession(db, token);
  if (!session) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  if (allowedRoles && !allowedRoles.includes((session as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user: session, db };
}

export function logRequest(request: NextRequest, response: NextResponse, durationMs: number, traceId: string) {
  const log = {
    timestamp: new Date().toISOString(),
    traceId,
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    durationMs,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent')?.slice(0, 100)
  };
  console.log(JSON.stringify(log));
}

export async function withKVRateLimit(request: NextRequest, kv: KVNamespace, maxRequests: number = 30, windowSeconds: number = 60): Promise<NextResponse | null> {
  const ip = getClientIP(request);
  const key = `ratelimit:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= maxRequests) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return null;
}

export async function withKVCache<T>(
  kv: KVNamespace,
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 60
): Promise<T> {
  const cached = await kv.get(key, 'text');
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch {}
  }
  const data = await fetchFn();
  await kv.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds });
  return data;
}

export async function invalidateKVCache(kv: KVNamespace, keyPrefix: string): Promise<void> {
  const list = await kv.list({ prefix: keyPrefix });
  for (const key of list.keys) {
    await kv.delete(key.name);
  }
}
