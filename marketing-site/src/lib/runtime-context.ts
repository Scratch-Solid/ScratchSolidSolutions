/**
 * @module runtime-context
 * @description Universal runtime context that works in both Cloudflare Workers
 * (via @opennextjs/cloudflare) and self-hosted (Hetzner/Node.js) deployments.
 *
 * In Cloudflare Workers: delegates to `@opennextjs/cloudflare` for real bindings.
 * In standalone mode: lazily loads PostgreSQL, Redis, and S3 facades so they
 * are invisible to bundlers targeting Cloudflare Workers.
 *
 * Returns the same `{ env, cf, ctx }` shape the application expects.
 */

export interface RuntimeEnv {
  [key: string]: unknown;
}

export interface CloudflareContext {
  env: RuntimeEnv;
  cf: Record<string, unknown>;
  ctx: { waitUntil: (p: Promise<unknown>) => void; passThroughOnException: () => void };
}

let cachedEnv: RuntimeEnv | null = null;
let standaloneEnvPromise: Promise<RuntimeEnv> | null = null;

async function buildEnvAsync(): Promise<RuntimeEnv> {
  if (cachedEnv) return cachedEnv;

  const env: RuntimeEnv = { ...process.env };

  // Lazily import standalone adapters so Cloudflare builds never trace them.
  const [{ getPgD1 }, { getKVNamespace }, { getR2Bucket }] = await Promise.all([
    import('./server/pg-d1'),
    import('./server/redis-kv'),
    import('./server/s3-r2'),
  ]);

  try {
    if (process.env.DATABASE_URL) {
      env.scratchsolid_db = getPgD1();
    } else {
      env.scratchsolid_db = null;
    }
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

const standaloneCtx = {
  waitUntil: (_p: Promise<unknown>) => {
    /* no-op: long-lived Node process, promises resolve naturally */
  },
  passThroughOnException: () => {
    /* no-op */
  },
};

/**
 * Returns the runtime context.
 *
 * In Cloudflare Workers this delegates to `@opennextjs/cloudflare`.
 * In standalone (Hetzner) mode it lazily loads the server adapters.
 */
export async function getCloudflareContext(
  _options?: { async?: boolean }
): Promise<CloudflareContext> {
  try {
    // Cloudflare Workers: the real implementation is available.
    // Use require inside the function so standalone bundlers don't trace it
    // at the top-level, but in the Cloudflare build it resolves correctly.
    const { getCloudflareContext: realGetCloudflareContext } =
       
      require('@opennextjs/cloudflare');
    return realGetCloudflareContext(_options);
  } catch {
    // Standalone mode: fall back to our custom env.
    if (!standaloneEnvPromise) {
      standaloneEnvPromise = buildEnvAsync();
    }
    const env = await standaloneEnvPromise;
    return {
      env,
      cf: {},
      ctx: standaloneCtx,
    };
  }
}

export default getCloudflareContext;
