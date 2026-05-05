/**
 * @module middleware
 * @description Core API middleware for Scratch Solid Solutions Next.js API routes.
 *
 * Exports:
 *   withTracing        — Generates / propagates a trace ID for each request.
 *   withSecurityHeaders — Attaches the full security-header suite to a NextResponse.
 *   withAuth           — Validates the Bearer-token session + optional RBAC role check.
 *   withKVRateLimit    — Cloudflare KV-backed rate limiter (persistent across isolates).
 *   withKVCache        — Cloudflare KV read-through cache helper.
 *   invalidateKVCache  — Clears all KV cache entries that match a key prefix.
 *
 * NOTE: Per-request rate limiting is handled in lib/rateLimit.ts.
 *       withAuth does NOT perform its own rate limiting — each route handler
 *       must call withRateLimit() from lib/rateLimit.ts before withAuth().
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, validateSession } from './db';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// ─── Internal helpers ────────────────────────────────────────────────────────

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function generateTraceId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Gets the KV namespace binding from the Cloudflare environment.
 * Returns null if not available (falls back to in-memory rate limiting).
 */
async function getKVBinding(): Promise<KVNamespace | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as any)?.RATE_LIMIT_KV || null;
  } catch {
    return null;
  }
}

/**
 * Unified rate limiter that uses KV when available, falls back to in-memory.
 *
 * This is the recommended function for all API routes. It automatically
 * uses Cloudflare KV for persistent rate limiting in production, and
 * falls back to in-memory limiting during development or if KV is unavailable.
 *
 * Returns null if within limit, or an object with success: false if exceeded.
 * The caller should return a 429 response when success is false.
 *
 * @param request       Incoming request.
 * @param options       Rate limit options (windowMs, maxRequests).
 * @returns null if within limit, or { success: false, ... } if exceeded.
 */
export async function withRateLimit(
  request: NextRequest,
  options: { windowMs: number; maxRequests: number } = { windowMs: 60000, maxRequests: 30 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | null> {
  const kv = await getKVBinding();
  if (kv) {
    // Use KV-based rate limiting (production)
    const kvResult = await withKVRateLimit(request, kv, options.maxRequests, Math.floor(options.windowMs / 1000));
    if (kvResult) {
      // Convert NextResponse to object structure for consistency
      return {
        success: false,
        limit: options.maxRequests,
        remaining: 0,
        reset: Date.now() + options.windowMs
      };
    }
    return null;
  }
  // Fallback to in-memory rate limiting (development)
  const { withRateLimit: inMemoryRateLimit } = await import('./rateLimit');
  return inMemoryRateLimit(request, options);
}

/** Re-export rateLimits for backward compatibility */
export { rateLimits } from './rateLimit';
export type { RateLimitOptions } from './rateLimit';

// ─── Tracing ─────────────────────────────────────────────────────────────────

/**
 * Returns the trace ID for the current request.
 * Re-uses an existing X-Request-ID or X-Trace-ID header when present;
 * generates a new UUID otherwise.
 */
export function withTracing(request: NextRequest): string {
  return (
    request.headers.get('X-Request-ID') ||
    request.headers.get('X-Trace-ID') ||
    generateTraceId()
  );
}

// ─── Security Headers ─────────────────────────────────────────────────────────

/**
 * Attaches the full security-header suite to a response and stamps it with
 * the request trace ID.
 *
 * Headers set:
 *   Content-Security-Policy, Strict-Transport-Security (HSTS 2-year + preload),
 *   X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
 *   Referrer-Policy, Permissions-Policy, X-Request-ID, X-Trace-ID.
 */
export function withSecurityHeaders(response: NextResponse, traceId: string): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Stricter CSP: removed unsafe-eval, kept unsafe-inline for styles (Tailwind CSS requirement)
  // Added report-uri for CSP violation monitoring
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " + // unsafe-eval removed - no eval() allowed
    "style-src 'self' 'unsafe-inline'; " + // Tailwind CSS requires unsafe-inline
    "img-src 'self' data: blob: https: https://marketing-site-ai3.pages.dev; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://books.zoho.com https://api.resend.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "manifest-src 'self';"
  );
  
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('X-Request-ID', traceId);
  response.headers.set('X-Trace-ID', traceId);
  return response;
}

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * Validates the Bearer token in the Authorization header against the sessions
 * table, then optionally enforces role-based access control.
 *
 * Returns `{ user, db }` on success.
 * Returns a NextResponse (401 / 403 / 503) on failure — callers must check
 * `instanceof NextResponse` and return early.
 *
 * Callers are responsible for rate-limiting before invoking withAuth.
 * Use withRateLimit() from lib/rateLimit.ts in each route handler.
 *
 * @param request      The incoming Next.js request.
 * @param allowedRoles Optional list of roles permitted to access the route.
 *
 * @example
 * const traceId = withTracing(request);
 * const rl = await withRateLimit(request, rateLimits.standard);
 * if (rl && !rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * const auth = await withAuth(request, ['admin']);
 * if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);
 * const { user, db } = auth;
 */
export async function withAuth(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<{ user: any; db: D1Database } | NextResponse> {
  const db = await getDb();
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

// ─── KV Rate Limiting (production-safe) ──────────────────────────────────────

/**
 * Cloudflare KV-backed rate limiter.
 *
 * Unlike the in-memory implementation in lib/rateLimit.ts, this persists
 * counts across all Worker isolates and is safe for production use.
 * Migrate routes to this implementation to replace the in-memory limiter.
 *
 * @param request       Incoming request (used to extract the client IP).
 * @param kv            KVNamespace binding from the Cloudflare environment.
 * @param maxRequests   Allowed requests per window (default 30).
 * @param windowSeconds Window size in seconds (default 60).
 * @returns A 429 NextResponse if the limit is exceeded; null otherwise.
 */
export async function withKVRateLimit(
  request: NextRequest,
  kv: KVNamespace,
  maxRequests = 30,
  windowSeconds = 60
): Promise<NextResponse | null> {
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

// ─── KV Cache ─────────────────────────────────────────────────────────────────

/**
 * Read-through cache backed by Cloudflare KV.
 *
 * Returns the cached value on hit; calls fetchFn, stores the result, and
 * returns it on miss. Silently falls through to fetchFn if the cached value
 * cannot be parsed.
 *
 * @param kv         KVNamespace binding.
 * @param key        Cache key.
 * @param fetchFn    Async function that produces the canonical value on cache miss.
 * @param ttlSeconds TTL for the stored entry (default 60 s).
 */
export async function withKVCache<T>(
  kv: KVNamespace,
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 60
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

/**
 * Deletes all KV cache entries whose keys begin with `keyPrefix`.
 * Call after a write mutation to invalidate stale cached reads.
 */
export async function invalidateKVCache(kv: KVNamespace, keyPrefix: string): Promise<void> {
  const list = await kv.list({ prefix: keyPrefix });
  for (const key of list.keys) {
    await kv.delete(key.name);
  }
}
