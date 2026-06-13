/**
 * @module runtime-context
 * @description Drop-in replacement for `@opennextjs/cloudflare`'s
 * `getCloudflareContext()` for the self-hosted (Hetzner) deployment.
 *
 * It returns the same `{ env, cf, ctx }` shape the application expects, but the
 * bindings are backed by server infrastructure instead of Cloudflare bindings:
 *   - `scratchsolid_db`  -> PostgreSQL (via the D1-compatible adapter)
 *   - `RATE_LIMIT_KV` / `GPS_KV` / `PUSH_KV` -> Redis
 *   - `UPLOADS_BUCKET`   -> S3-compatible object storage (R2/MinIO)
 *   - all string vars    -> `process.env`
 *
 * Existing imports of `getCloudflareContext` from `@opennextjs/cloudflare`
 * are repointed to this module, so call sites remain unchanged.
 */

import { getPgD1 } from './server/pg-d1';
import { getKVNamespace } from './server/redis-kv';
import { getR2Bucket } from './server/s3-r2';

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
  const env: RuntimeEnv = { ...process.env };

  try {
    env.scratchsolid_db = getPgD1();
  } catch (err) {
    console.error('[runtime-context] PostgreSQL unavailable:', err);
    env.scratchsolid_db = null;
  }

  try {
    env.RATE_LIMIT_KV = getKVNamespace('rl:');
    env.GPS_KV = getKVNamespace('gps:');
    env.PUSH_KV = getKVNamespace('push:');
  } catch (err) {
    console.error('[runtime-context] Redis KV unavailable:', err);
  }

  try {
    env.UPLOADS_BUCKET = getR2Bucket();
  } catch (err) {
    console.error('[runtime-context] R2/S3 unavailable:', err);
    env.UPLOADS_BUCKET = null;
  }

  cachedEnv = env;
  return cachedEnv;
}

const ctx = {
  waitUntil: (_p: Promise<unknown>) => {
    /* no-op: long-lived Node process, promises resolve naturally */
  },
  passThroughOnException: () => {
    /* no-op */
  },
};

/**
 * Returns the runtime context. Accepts the same optional `{ async }` argument as
 * the Cloudflare implementation. The returned object can be used directly or
 * awaited (awaiting a non-promise yields the value), so both call styles work.
 */
export function getCloudflareContext(_options?: { async?: boolean }): CloudflareContext {
  return {
    env: buildEnv(),
    cf: {},
    ctx,
  };
}

export default getCloudflareContext;
