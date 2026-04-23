/**
 * Cloudflare Workers Reverse Proxy + Cache Layer
 * Free load balancer and edge cache for Scratch Solid Solutions
 * Deploys as a Cloudflare Worker in front of both marketing-site and internal-portal
 */

const MARKETING_ORIGIN = 'https://scratchsolid.com';
const PORTAL_ORIGIN = 'https://portal.scratchsolid.com';
const API_ORIGIN = 'https://api.scratchsolid.com';

const CACHEABLE_PATHS = [
  { pattern: /^\/api\/content\//, ttl: 300, type: 'public' },
  { pattern: /^\/api\/cleaner-details/, ttl: 60, type: 'private' },
  { pattern: /^\/api\/cleaner-profile/, ttl: 60, type: 'private' },
  { pattern: /^\/api\/status/, ttl: 0, type: 'no-store' },
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

function getOrigin(pathname) {
  if (pathname.startsWith('/api/')) return API_ORIGIN;
  if (pathname.startsWith('/portal')) return PORTAL_ORIGIN;
  return MARKETING_ORIGIN;
}

function getCacheConfig(pathname) {
  for (const { pattern, ttl, type } of CACHEABLE_PATHS) {
    if (pattern.test(pathname)) return { ttl, type };
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = getOrigin(url.pathname);
    const traceId = request.headers.get('X-Trace-ID') || crypto.randomUUID();

    // Rate limiting via KV
    if (env.RATE_LIMIT_KV) {
      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      const windowKey = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
      const count = parseInt((await env.RATE_LIMIT_KV.get(windowKey)) || '0');
      if (count >= 100) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
        });
      }
      ctx.waitUntil(env.RATE_LIMIT_KV.put(windowKey, String(count + 1), { expirationTtl: 120 }));
    }

    // KV cache for read-only GET requests
    const cacheConfig = request.method === 'GET' ? getCacheConfig(url.pathname) : null;
    if (cacheConfig && cacheConfig.ttl > 0 && env.CACHE_KV) {
      const cacheKey = `cache:${url.pathname}${url.search}`;
      const cached = await env.CACHE_KV.get(cacheKey, 'text');
      if (cached) {
        const headers = {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Trace-ID': traceId,
          'Cache-Control': `${cacheConfig.type}, max-age=${cacheConfig.ttl}`,
          ...SECURITY_HEADERS,
        };
        return new Response(cached, { headers });
      }
    }

    // Forward request to origin
    const originUrl = new URL(url.pathname + url.search, origin);
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('X-Trace-ID', traceId);
    forwardHeaders.set('X-Forwarded-For', request.headers.get('cf-connecting-ip') || '');
    forwardHeaders.set('X-Real-IP', request.headers.get('cf-connecting-ip') || '');

    const originResponse = await fetch(originUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    // Clone response to add headers and cache
    const responseHeaders = new Headers(originResponse.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      responseHeaders.set(key, value);
    }
    responseHeaders.set('X-Trace-ID', traceId);
    responseHeaders.set('X-Cache', 'MISS');

    if (cacheConfig) {
      responseHeaders.set('Cache-Control', `${cacheConfig.type}, max-age=${cacheConfig.ttl}`);
    }

    // Store in KV cache for cacheable GET responses
    if (cacheConfig && cacheConfig.ttl > 0 && originResponse.ok && env.CACHE_KV) {
      const cacheKey = `cache:${url.pathname}${url.search}`;
      const body = await originResponse.clone().text();
      ctx.waitUntil(env.CACHE_KV.put(cacheKey, body, { expirationTtl: cacheConfig.ttl }));
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      headers: responseHeaders,
    });
  },
};
