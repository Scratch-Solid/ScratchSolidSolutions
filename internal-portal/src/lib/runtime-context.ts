/**
 * @module runtime-context
 * @description Universal runtime context that works in BOTH Cloudflare Workers
 * (via `@opennextjs/cloudflare`) and the self-hosted (Hetzner/Node.js)
 * deployment of the internal portal.
 *
 * Resolution order:
 *   1. Cloudflare Workers — delegate to `@opennextjs/cloudflare` so real D1/KV/R2
 *      bindings are used (this is the current production deployment target).
 *   2. Standalone (Hetzner) — lazily build an env backed by server infra:
 *        - `scratchsolid_db` -> PostgreSQL (DATABASE_URL)
 *        - `training_db`     -> PostgreSQL (TRAINING_DATABASE_URL, falls back to DATABASE_URL)
 *        - `RATE_LIMIT_KV` / `GPS_KV` / `PUSH_KV` / `STATUS_KV` -> Redis
 *        - `UPLOADS_BUCKET` / `CLEANER_PHOTOS_BUCKET` -> S3-compatible object storage
 *        - all string vars   -> `process.env`
 *
 * NOTE: Previously this module ALWAYS returned the PostgreSQL-backed env, which
 * broke the live Cloudflare deployment (no Postgres reachable there -> the D1
 * health check failed with "proxy request failed"). The Cloudflare-first
 * resolution below fixes that while keeping the Hetzner path fully functional.
 */

// Lazy imports to avoid loading server-only modules in test environments (jsdom)
let getPgD1: ((url: string) => unknown) | null = null;
let getKVNamespace: ((prefix: string) => unknown) | null = null;
let getR2Bucket: ((bucket: string) => unknown) | null = null;

export interface RuntimeEnv {
  [key: string]: unknown;
}

export interface CloudflareContext {
  env: RuntimeEnv;
  cf: Record<string, unknown>;
  ctx: { waitUntil: (p: Promise<unknown>) => void; passThroughOnException: () => void };
}

let cachedEnv: RuntimeEnv | null = null;

function buildEnv(): RuntimeEnv {
  if (cachedEnv) return cachedEnv;

  // In test environments, return stub bindings to avoid real DB connections
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
  if (isTest && !process.env.DATABASE_URL) {
    const noopDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [], success: true }),
          run: async () => ({ success: true }),
        }),
      }),
    };
    const noopKv = {
      get: async () => null,
      put: async () => {},
      delete: async () => {},
      list: async () => ({ keys: [] }),
    };
    const noopR2 = {
      get: async () => null,
      put: async () => ({ etag: 'test' }),
      delete: async () => {},
      list: async () => ({ objects: [] }),
      head: async () => null,
    };
    cachedEnv = {
      ...process.env,
      scratchsolid_db: noopDb,
      training_db: noopDb,
      RATE_LIMIT_KV: noopKv,
      GPS_KV: noopKv,
      PUSH_KV: noopKv,
      STATUS_KV: noopKv,
      UPLOADS_BUCKET: noopR2,
      CLEANER_PHOTOS_BUCKET: noopR2,
    };
    return cachedEnv;
  }

  // Lazy-load server adapters only when needed (avoids pg/redis/s3 in jsdom tests)
  if (!getPgD1) {
    const pgD1 = require('./server/pg-d1');
    getPgD1 = pgD1.getPgD1;
  }
  if (!getKVNamespace) {
    const redisKv = require('./server/redis-kv');
    getKVNamespace = redisKv.getKVNamespace;
  }
  if (!getR2Bucket) {
    const s3R2 = require('./server/s3-r2');
    getR2Bucket = s3R2.getR2Bucket;
  }

  const primaryDbUrl = process.env.DATABASE_URL || '';
  const trainingDbUrl = process.env.TRAINING_DATABASE_URL || primaryDbUrl;
  const uploadsBucket = process.env.S3_BUCKET || 'scratchsolid-uploads';
  const photosBucket = process.env.S3_PHOTOS_BUCKET || uploadsBucket;

  cachedEnv = {
    ...process.env,
    scratchsolid_db: getPgD1(primaryDbUrl),
    training_db: getPgD1(trainingDbUrl),
    RATE_LIMIT_KV: getKVNamespace('rl:'),
    GPS_KV: getKVNamespace('gps:'),
    PUSH_KV: getKVNamespace('push:'),
    STATUS_KV: getKVNamespace('status:'),
    UPLOADS_BUCKET: getR2Bucket(uploadsBucket),
    CLEANER_PHOTOS_BUCKET: getR2Bucket(photosBucket),
  };
  return cachedEnv;
}

const ctx = {
  waitUntil: (_p: Promise<unknown>) => {},
  passThroughOnException: () => {},
};

/**
 * Resolve the runtime context.
 *
 * On Cloudflare Workers this returns the real `@opennextjs/cloudflare` context
 * (real D1/KV/R2 bindings). In standalone/Hetzner mode — or when the Cloudflare
 * context is unavailable — it returns the PostgreSQL/Redis/S3-backed env.
 *
 * All call sites already `await` this function, so returning a Promise is safe.
 */
export async function getCloudflareContext(
  options?: { async?: boolean }
): Promise<CloudflareContext> {
  // Test environments without an explicit DB use the in-memory stubs from buildEnv().
  const isTest = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
  if (isTest && !process.env.DATABASE_URL) {
    return { env: buildEnv(), cf: {}, ctx };
  }

  // 1. Cloudflare Workers: use the real bindings (current production target).
  //    `require` is used inside the function so standalone bundlers don't trace
  //    `@opennextjs/cloudflare` at module scope; in the Cloudflare build it
  //    resolves correctly. If we're not on Workers (or context isn't ready),
  //    this throws and we fall through to the standalone env.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@opennextjs/cloudflare');
    if (mod && typeof mod.getCloudflareContext === 'function') {
      const real = await mod.getCloudflareContext(options ?? { async: true });
      if (real && real.env) {
        return real as CloudflareContext;
      }
    }
  } catch {
    // Not on Cloudflare Workers — fall through to the self-hosted env.
  }

  // 2. Standalone (Hetzner): PostgreSQL/Redis/S3-backed env.
  return { env: buildEnv(), cf: {}, ctx };
}

export default getCloudflareContext;
