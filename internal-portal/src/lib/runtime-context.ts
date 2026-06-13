/**
 * @module runtime-context
 * @description Drop-in replacement for `@opennextjs/cloudflare`'s
 * `getCloudflareContext()` for the self-hosted (Hetzner) deployment of the
 * internal portal.
 *
 * Bindings are backed by server infrastructure:
 *   - `scratchsolid_db` -> PostgreSQL (DATABASE_URL)
 *   - `training_db`     -> PostgreSQL (TRAINING_DATABASE_URL, falls back to DATABASE_URL)
 *   - `RATE_LIMIT_KV` / `GPS_KV` / `PUSH_KV` / `STATUS_KV` -> Redis
 *   - `UPLOADS_BUCKET` / `CLEANER_PHOTOS_BUCKET` -> S3-compatible object storage
 *   - all string vars   -> `process.env`
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

export function getCloudflareContext(_options?: { async?: boolean }): CloudflareContext {
  return { env: buildEnv(), cf: {}, ctx };
}

export default getCloudflareContext;
