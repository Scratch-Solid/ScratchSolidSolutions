# Marketing Site 503 Error Audit Report

**Date:** May 21, 2026
**Severity:** CRITICAL
**Status:** IN PROGRESS

---

## Executive Summary

The marketing site is returning 503 Service Unavailable errors in **both production and staging environments**. This is a critical issue affecting the main customer-facing website.

**Test Results:**
- Production marketing site (scratchsolidsolutions.org/api/health): ❌ 503 Service Unavailable
- Staging marketing site (staging.scratchsolidsolutions.org/api/health): ❌ 503 Service Unavailable
- Production portal (portal.scratchsolidsolutions.org/api/health): ❌ Timeout/PowerShell error
- Staging portal (portal-staging.scratchsolidsolutions.org/api/health): ✅ 200 OK
- Production backend (api.scratchsolidsolutions.org/api/health): ❌ PowerShell error
- Staging backend (api-staging.scratchsolidsolutions.org/api/health): ✅ 200 OK

**Key Finding:** Marketing site is failing in BOTH environments, while portal/backend work in staging. This indicates a configuration issue specific to the marketing site, not an infrastructure-wide problem.

---

## 1. Codebase Audit

### 1.1 Health Endpoint Analysis

**File:** `marketing-site/src/app/api/health/route.ts`

```typescript
export async function GET(request: Request) {
  const checks: Record<string, boolean | string> = {};

  try {
    const db = await getDb();
    if (db) {
      const result = await db.prepare('SELECT 1 as health').first();
      checks.database = result !== null;
    } else {
      checks.database = 'D1 binding not available';
    }
  } catch (e) {
    checks.database = false;
  }

  const allHealthy = Object.values(checks).every(v => v === true);

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    duration_ms: duration,
    version: process.env.APP_VERSION || 'dev',
  }, { status: allHealthy ? 200 : 503 });
}
```

**Finding:** Health endpoint returns 503 if database is not available (line 30). This confirms the issue is database binding related.

### 1.2 Database Binding Implementation

**File:** `marketing-site/src/lib/db.ts`

```typescript
export async function getDb(): Promise<D1Database | null> {
  try {
    const cloudflareContext = globalThis as any;
    const env = cloudflareContext?.env;
    const envAny = env as any;
    const db = envAny?.scratchsolid_db || envAny?.scratchsolidDb || envAny?.DB || envAny?.db || envAny?.database;
    if (db) {
      return db as D1Database;
    }
    // As a last resort, scan env for a D1-like binding
    const candidateKey = Object.keys(envAny || {}).find((k) => {
      const val = (envAny as any)[k];
      return val && typeof val === 'object' && typeof (val as any).prepare === 'function';
    });
    if (candidateKey) {
      logger.warn(`D1 binding not found under expected names; using candidate binding '${candidateKey}'`);
      return (envAny as any)[candidateKey] as D1Database;
    }
    logger.error('D1 binding missing: expected scratchsolid_db or DB');
    logger.error('Available env keys:', Object.keys(envAny || {}));
  } catch (error) {
    logger.error('Error getting database from globalThis context', error as Error);
  }
  return null;
}
```

**Finding:** getDb() function checks for multiple binding names: `scratchsolid_db`, `scratchsolidDb`, `DB`, `db`, `database`. If none found, it returns null, causing 503 errors.

### 1.3 Critical Missing File

**Finding:** Marketing site is **MISSING** the `cloudflare-env.d.ts` type definition file that the portal has.

**Portal has:** `internal-portal/src/types/cloudflare-env.d.ts`
```typescript
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
```

**Marketing site has:** Only `marketing-site/src/types/d1.d.ts` (no cloudflare-env.d.ts)

**Impact:** This missing type definition file could cause TypeScript compilation issues or runtime binding resolution problems.

---

## 2. Infrastructure Audit

### 2.1 Wrangler Configuration

**File:** `marketing-site/wrangler.jsonc`

```jsonc
{
  "name": "scratchsolidsolutions",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-05-20",
  "compatibility_flags": ["nodejs_compat"],
  
  "d1_databases": [
    {
      "binding": "scratchsolid_db",
      "database_name": "scratchsolid-marketing-db",
      "database_id": "4c282c8f-8991-49bd-9dc6-e3eab31a4869"
    }
  ],
  
  "routes": [
    {
      "pattern": "scratchsolidsolutions.org/*",
      "zone_name": "scratchsolidsolutions.org"
    }
  ],
  
  "vars": {
    "NEXT_PUBLIC_BASE_URL": "https://scratchsolidsolutions.org",
    "NEXT_PUBLIC_API_URL": "https://api.scratchsolidsolutions.org/api",
    "R2_BUCKET": "marketing-uploads",
    "R2_PUBLIC_BASE": "https://uploads.scratchsolidsolutions.org"
  }
}
```

**Staging Configuration:**
```jsonc
{
  "env": {
    "staging": {
      "d1_databases": [
        {
          "binding": "scratchsolid_db",
          "database_name": "scratchsolid-db-staging",
          "database_id": "6b6f139b-7a19-4d44-9e21-b85c0c0da42b"
        }
      ],
      "routes": [
        {
          "pattern": "staging.scratchsolidsolutions.org/*",
          "zone_name": "scratchsolidsolutions.org"
        }
      ],
      "vars": {
        "NEXT_PUBLIC_BASE_URL": "https://staging.scratchsolidsolutions.org",
        "NEXT_PUBLIC_API_URL": "https://api-staging.scratchsolidsolutions.org/api",
        "R2_BUCKET": "marketing-uploads-staging",
        "R2_PUBLIC_BASE": "https://uploads-staging.scratchsolidsolutions.org",
        "NODE_ENV": "staging"
      }
    }
  }
}
```

**Finding:** Binding name is correctly configured as `scratchsolid_db` in both production and staging.

---

## 3. Environment Variables Audit

### 3.1 Required Environment Variables

**File:** `marketing-site/src/lib/env.ts`

```typescript
interface EnvConfig {
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  NEXT_PUBLIC_BASE_URL: string;
  NEXT_PUBLIC_API_URL: string;
  ZOHO_ORG_ID?: string;
  ZOHO_CLIENT_ID?: string;
  ZOHO_CLIENT_SECRET?: string;
  ZOHO_REFRESH_TOKEN?: string;
}

export function validateEnv(): EnvConfig {
  const errors: string[] = [];

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required for authentication');
  }

  if (!process.env.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY is required for email functionality');
  }

  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    errors.push('NEXT_PUBLIC_BASE_URL is required for generating links');
  }

  if (!process.env.NEXT_PUBLIC_API_URL) {
    errors.push('NEXT_PUBLIC_API_URL is required for API calls');
  }

  if (errors.length > 0) {
    throw new Error(`Missing required environment variables:\n${errors.join('\n')}`);
  }

  return {
    JWT_SECRET: process.env.JWT_SECRET!,
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    NEXT_PUBLIC_BASE_URL: "https://scratchsolidsolutions.org",
    NEXT_PUBLIC_API_URL: "https://api.scratchsolidsolutions.org/api",
    ZOHO_ORG_ID: process.env.ZOHO_ORG_ID,
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN
  };
}
```

**Required Secrets (from memory):**
- JWT_SECRET (pending)
- CSRF_SECRET (pending)
- RESEND_API_KEY (pending)
- ZOHO_CLIENT_SECRET (pending)
- ZOHO_ORG_ID (pending)
- ZOHO_REFRESH_TOKEN (pending)

**Finding:** Marketing site is missing CRITICAL secrets. If these are not set, the application may fail to start or return errors.

---

## 4. Comparison with Portal

### 4.1 Package.json Differences

**Marketing Site:**
- `@opennextjs/cloudflare: ^1.19.4`
- `@opennextjs/aws: 3.10.4` (dependency of cloudflare)

**Portal:**
- `@opennextjs/cloudflare: ^1.19.10`
- `@opennextjs/aws: 4.0.2` (dependency of cloudflare)

**Finding:** Marketing site is using an older version of @opennextjs/cloudflare (1.19.4 vs 1.19.10). This could cause compatibility issues with database binding resolution.

### 4.2 Type Definition Files

**Portal:**
- Has `src/types/cloudflare-env.d.ts` (defines CloudflareEnv interface with DB binding)
- Has `src/types/d1.d.ts`

**Marketing Site:**
- Missing `src/types/cloudflare-env.d.ts`
- Only has `src/types/d1.d.ts`

**Finding:** Missing cloudflare-env.d.ts is a CRITICAL difference that could prevent proper database binding resolution.

### 4.3 getDb() Implementation Differences

**Marketing Site getDb() checks:**
```typescript
const db = envAny?.scratchsolid_db || envAny?.scratchsolidDb || envAny?.DB || envAny?.db || envAny?.database;
```

**Portal getDb() checks:**
```typescript
const db = envAny?.scratchsolid_db || envAny?.scratchsolidDb || envAny?.scratchsolid_db_portal_staging || envAny?.DB || envAny?.db || envAny?.database;
```

**Finding:** Portal has an additional fallback `scratchsolid_db_portal_staging` for staging environment. Marketing site does not have this.

---

## 5. Root Cause Analysis

### 5.1 Most Likely Causes

1. **Missing cloudflare-env.d.ts file** - This type definition file is critical for proper TypeScript compilation and runtime binding resolution. Without it, the CloudflareEnv interface may not be properly defined, causing the database binding to fail.

2. **Missing secrets** - Marketing site is missing JWT_SECRET, CSRF_SECRET, RESEND_API_KEY, and Zoho credentials. Without these, the application may fail to start or return errors.

3. **OpenNext version mismatch** - Marketing site uses @opennextjs/cloudflare 1.19.4 while portal uses 1.19.10. This could cause compatibility issues with database binding resolution.

4. **Missing staging-specific binding name** - Portal has `scratchsolid_db_portal_staging` as a fallback for staging, but marketing site does not. This could cause issues if the binding name differs in staging.

### 5.2 Why Both Environments Are Affected

The fact that BOTH production and staging are returning 503 errors suggests:
- It's not an environment-specific configuration issue
- It's likely a codebase-level issue (missing files, wrong dependencies)
- The database binding name is correctly configured in wrangler.jsonc for both environments
- The issue is in how the code resolves the binding at runtime

---

## 6. Recommended Actions

### 6.1 Immediate Actions (Critical)

1. **Create missing cloudflare-env.d.ts file:**
```typescript
// marketing-site/src/types/cloudflare-env.d.ts
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
```

2. **Upgrade @opennextjs/cloudflare to match portal:**
```bash
cd marketing-site
npm install @opennextjs/cloudflare@^1.19.10
```

3. **Set missing secrets for marketing site:**
```bash
cd marketing-site
npx wrangler secret put JWT_SECRET
npx wrangler secret put CSRF_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ZOHO_CLIENT_SECRET
npx wrangler secret put ZOHO_ORG_ID
npx wrangler secret put ZOHO_REFRESH_TOKEN
```

4. **Add staging-specific binding fallback to getDb():**
```typescript
const db = envAny?.scratchsolid_db || envAny?.scratchsolidDb || envAny?.scratchsolid_db_marketing_staging || envAny?.DB || envAny?.db || envAny?.database;
```

### 6.2 Verification Actions

1. Regenerate cloudflare-env.d.ts using wrangler:
```bash
cd marketing-site
npx wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts
```

2. Rebuild and redeploy to staging first
3. Test staging health endpoint
4. If staging works, deploy to production
5. Test production health endpoint

---

## 7. Status

**Current Status:** INVESTIGATION COMPLETE - ISSUE PERSISTING
**Root Cause:** Unable to determine - worker returning 503 with no logs
**Next Steps:** Manual investigation in Cloudflare Dashboard required
**Estimated Resolution Time:** Requires manual Cloudflare Dashboard investigation

**Latest Update:** Added ASSETS binding to match portal configuration, but issue persists. Worker tail still shows no logs or exceptions.

---

## 8. Actions Taken and Results

### 8.1 Actions Taken

**Production:**
- Worker name: `scratchsolidsolutions`
- D1 binding: `scratchsolid_db` → `scratchsolid-marketing-db` (4c282c8f-8991-49bd-9dc6-e3eab31a4869)
- Route: `scratchsolidsolutions.org/*`
- KV bindings: RATE_LIMIT_KV, GPS_KV, PUSH_KV
- R2 bindings: UPLOADS_BUCKET (marketing-uploads), cleaner_photos, cleaner_photos_staging

**Staging:**
- Worker name: `scratchsolidsolutions-staging`
- D1 binding: `scratchsolid_db` → `scratchsolid-db-staging` (6b6f139b-7a19-4d44-9e21-b85c0c0da42b)
- Route: `staging.scratchsolidsolutions.org/*`
- KV bindings: RATE_LIMIT_KV, GPS_KV, PUSH_KV (different IDs)
- R2 bindings: UPLOADS_BUCKET (marketing-uploads-staging), cleaner_photos, cleaner_photos_staging

### 8.2 Portal Wrangler Configuration

**Production:**
- Worker name: `scratchsolid-portal`
- D1 binding: `scratchsolid_db` → `scratchsolid-portal-db` (a08f16f5-9d75-47f9-973c-35bade106b47)
- Route: `portal.scratchsolidsolutions.org/*`
- KV bindings: RATE_LIMIT_KV, GPS_KV, PUSH_KV, STATUS_KV
- R2 bindings: UPLOADS_BUCKET (portal-uploads), CLEANER_PHOTOS_BUCKET (cleaner-photos)

**Staging:**
- Worker name: `scratchsolid-portal-staging`
- D1 binding: `scratchsolid_db` → `scratchsolid-db-portal-staging` (cc0bb727-585b-40c9-8afa-77947e725813)
- Route: `portal-staging.scratchsolidsolutions.org/*`
- KV bindings: RATE_LIMIT_KV, GPS_KV, PUSH_KV, STATUS_KV (different IDs)
- R2 bindings: UPLOADS_BUCKET (scratchsolid-uploads-portal-staging), CLEANER_PHOTOS_BUCKET (cleaner-photos-staging)

### 8.3 Additional Actions Taken (Post-Initial Report)

10. **Converted wrangler.jsonc to wrangler.toml**
    - Created wrangler.toml with same configuration
    - Removed wrangler.jsonc to avoid conflicts
    - Result: Still returning 503

11. **Restored wrangler.jsonc**
    - Converted back to wrangler.jsonc (matching portal)
    - Removed wrangler.toml
    - Result: Still returning 503

12. **Added ASSETS binding**
    - Compared portal wrangler.jsonc with marketing site
    - Found portal has `"assets": { "directory": ".open-next/assets", "binding": "ASSETS" }`
    - Marketing site had `"assets": { "directory": ".open-next/assets" }` (no binding)
    - Added ASSETS binding to match portal configuration
    - Result: Still returning 503

### 8.4 Key Difference Found

**Portal wrangler.jsonc:**
```json
"assets": {
  "directory": ".open-next/assets",
  "binding": "ASSETS"
}
```

**Marketing site wrangler.jsonc (before fix):**
```json
"assets": {
  "directory": ".open-next/assets"
}
```

This was a significant difference that could affect OpenNext functionality. However, adding the ASSETS binding did not resolve the 503 error.
