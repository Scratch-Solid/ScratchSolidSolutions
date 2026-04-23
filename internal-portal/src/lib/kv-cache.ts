// Cloudflare KV caching layer for D1 read replicas and edge caching
// Falls back to in-memory cache if KV is not configured

const KV_CACHE_TTL = 300; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

function getCacheKey(table: string, query: string, params?: any[]): string {
  const paramHash = params ? JSON.stringify(params) : '';
  return `d1:${table}:${query}:${paramHash}`;
}

export async function getCachedQuery(table: string, query: string, params?: any[]): Promise<any | null> {
  const key = getCacheKey(table, query, params);

  // Try in-memory first (client-side / Worker runtime)
  const memEntry = memoryCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < KV_CACHE_TTL * 1000) {
    return memEntry.data;
  }

  // Try KV if available
  try {
    // @ts-ignore
    const kv = (globalThis as any).KV_CACHE;
    if (kv) {
      const cached = await kv.get(key, { type: 'json' });
      if (cached) {
        memoryCache.set(key, { data: cached, timestamp: Date.now() });
        return cached;
      }
    }
  } catch {
    // KV not available, fall through
  }

  return null;
}

export async function setCachedQuery(table: string, query: string, params: any[] | undefined, data: any, ttl: number = KV_CACHE_TTL): Promise<void> {
  const key = getCacheKey(table, query, params);
  memoryCache.set(key, { data, timestamp: Date.now() });

  try {
    // @ts-ignore
    const kv = (globalThis as any).KV_CACHE;
    if (kv) {
      await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
    }
  } catch {
    // KV not available, in-memory cache is sufficient
  }
}

export async function invalidateCache(table: string): Promise<void> {
  const prefix = `d1:${table}:`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  try {
    // @ts-ignore
    const kv = (globalThis as any).KV_CACHE;
    if (kv) {
      // Cloudflare KV does not support prefix delete; use tags or list + delete in production
    }
  } catch {
    // KV not available
  }
}

// Wrapper for D1 prepared statement with cache
export async function cachedQuery(
  db: D1Database,
  table: string,
  sql: string,
  params?: any[],
  ttl: number = KV_CACHE_TTL
): Promise<any> {
  const cached = await getCachedQuery(table, sql, params);
  if (cached !== null) return cached;

  const stmt = db.prepare(sql);
  const result = params ? await stmt.bind(...params).all() : await stmt.all();

  await setCachedQuery(table, sql, params, result, ttl);
  return result;
}
