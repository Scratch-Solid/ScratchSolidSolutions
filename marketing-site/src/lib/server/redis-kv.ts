/**
 * @module redis-kv
 * @description Redis-backed implementation of the Cloudflare KV namespace
 * interface used by the app (`get`, `put`, `list`, `delete`).
 *
 * A single Redis instance backs all three logical namespaces
 * (RATE_LIMIT_KV, GPS_KV, PUSH_KV); each namespace is isolated by a key prefix.
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    redis.on('error', (err) => console.error('[redis-kv] error', err));
  }
  return redis;
}

export interface KVPutOptions {
  expirationTtl?: number;
  expiration?: number;
}

export interface KVListResult {
  keys: { name: string }[];
  list_complete: boolean;
  cursor?: string;
}

/**
 * Cloudflare KVNamespace-compatible facade over Redis.
 */
export class RedisKVNamespace {
  constructor(private readonly prefix: string) {}

  private k(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string, _type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<string | null> {
    return getRedis().get(this.k(key));
  }

  async put(key: string, value: string, options?: KVPutOptions): Promise<void> {
    const fullKey = this.k(key);
    if (options?.expirationTtl && options.expirationTtl > 0) {
      await getRedis().set(fullKey, value, 'EX', Math.ceil(options.expirationTtl));
    } else if (options?.expiration && options.expiration > 0) {
      const ttl = Math.max(1, Math.ceil(options.expiration - Date.now() / 1000));
      await getRedis().set(fullKey, value, 'EX', ttl);
    } else {
      await getRedis().set(fullKey, value);
    }
  }

  async delete(key: string): Promise<void> {
    await getRedis().del(this.k(key));
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<KVListResult> {
    const matchPrefix = `${this.prefix}${options?.prefix ?? ''}`;
    const keys: { name: string }[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await getRedis().scan(cursor, 'MATCH', `${matchPrefix}*`, 'COUNT', 200);
      cursor = next;
      for (const fullKey of batch) {
        // Strip the namespace prefix to mirror Cloudflare KV semantics.
        keys.push({ name: fullKey.slice(this.prefix.length) });
        if (options?.limit && keys.length >= options.limit) {
          return { keys, list_complete: false, cursor };
        }
      }
    } while (cursor !== '0');
    return { keys, list_complete: true };
  }
}

const namespaces = new Map<string, RedisKVNamespace>();

export function getKVNamespace(prefix: string): RedisKVNamespace {
  let ns = namespaces.get(prefix);
  if (!ns) {
    ns = new RedisKVNamespace(prefix);
    namespaces.set(prefix, ns);
  }
  return ns;
}
