/**
 * @module rateLimit
 * @description In-memory rate limiting for Next.js API route handlers.
 *
 * ⚠️  CLOUDFLARE WORKERS NOTE: This implementation stores counts in a
 * JavaScript Map in module scope. On Cloudflare Workers (stateless/edge),
 * each isolate has its own memory — limits are NOT shared across instances.
 * For production enforcement, migrate to withKVRateLimit() in lib/middleware.ts,
 * which uses Cloudflare KV for persistent, cross-isolate counting.
 *
 * Exports:
 *   withRateLimit     — Primary helper used in all route handlers.
 *   rateLimits        — Pre-defined configuration presets.
 *   rateLimit         — Low-level factory (use withRateLimit instead).
 *   getClientIdentifier — Extracts a stable client key from request headers.
 */

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

/** Options passed to the rate limiter. */
export interface RateLimitOptions {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum requests allowed per window per client. */
  maxRequests: number;
}

/**
 * Low-level rate limiter factory.
 * Returns an async function that tracks and enforces request counts per
 * client identifier within a sliding fixed window.
 *
 * Prefer withRateLimit() for use in route handlers.
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests } = options;

  return async (
    _request: Request,
    identifier: string
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> => {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (record && record.resetTime < now) {
      rateLimitStore.delete(identifier);
    }

    const currentRecord = rateLimitStore.get(identifier) ?? { count: 0, resetTime: now + windowMs };

    if (currentRecord.resetTime < now) {
      currentRecord.count = 0;
      currentRecord.resetTime = now + windowMs;
    }

    currentRecord.count++;
    rateLimitStore.set(identifier, currentRecord);

    return {
      success: currentRecord.count <= maxRequests,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - currentRecord.count),
      reset: currentRecord.resetTime,
    };
  };
}

/**
 * Extracts a stable client identifier from request headers.
 * Checks CF-Connecting-IP (Cloudflare), X-Forwarded-For, then X-Real-IP.
 */
export function getClientIdentifier(request: Request): string {
  const headers = request.headers as any;
  const ip =
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    'unknown';
  return `ip:${ip}`;
}

/**
 * Rate-limit middleware for Next.js API route handlers.
 *
 * Returns null if the request is within the allowed limit, or an object with
 * `success: false` that the caller should respond to with HTTP 429.
 *
 * @example
 * const rl = await withRateLimit(request, rateLimits.auth);
 * if (rl && !rl.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 */
export async function withRateLimit(
  request: Request,
  options: RateLimitOptions = rateLimits.standard
): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | null> {
  const identifier = getClientIdentifier(request);
  const limiter = rateLimit(options);
  return await limiter(request, identifier);
}

/** Pre-defined rate limit presets. */
export const rateLimits = {
  /** Authentication endpoints — 5 attempts per 15 minutes. (login, signup, forgot-password) */
  auth:     { windowMs: 15 * 60 * 1000, maxRequests: 5   },
  /** General API endpoints — 100 requests per minute. */
  standard: { windowMs: 60 * 1000,       maxRequests: 100 },
  /** Public / high-traffic endpoints — 200 requests per minute. */
  public:   { windowMs: 60 * 1000,       maxRequests: 200 },
  /** Sensitive operations — 10 requests per minute. (upload, quote, account-delete) */
  strict:   { windowMs: 60 * 1000,       maxRequests: 10  },
};
