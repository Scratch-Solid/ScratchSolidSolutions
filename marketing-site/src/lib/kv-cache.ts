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
  const memEntry = memoryCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < KV_CACHE_TTL * 1000) {
    return memEntry.data;
  }
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
  } catch {}
  return null;
}

export async function setCachedQuery(table: string, query: string, params: any[] | undefined, data: any, ttl: number = KV_CACHE_TTL): Promise<void> {
  const key = getCacheKey(table, query, params);
  memoryCache.set(key, { data, timestamp: Date.now() });
  try {
    // @ts-ignore
    const kv = (globalThis as any).KV_CACHE;
    if (kv) await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
  } catch {}
}

export async function invalidateCache(table: string): Promise<void> {
  const prefix = `d1:${table}:`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
}
