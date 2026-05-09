import type { CloudflareEnv } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

declare global {
  interface CloudflareEnv extends Env {
    DB: D1Database;
  }
}

interface Env {
  DB: D1Database;
}

export {};
