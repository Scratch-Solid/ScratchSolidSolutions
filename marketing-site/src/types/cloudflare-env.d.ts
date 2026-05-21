import type { CloudflareEnv } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

declare global {
  interface CloudflareEnv extends Env {
    scratchsolid_db: D1Database;
  }
}

interface Env {
  scratchsolid_db: D1Database;
}

export {};
