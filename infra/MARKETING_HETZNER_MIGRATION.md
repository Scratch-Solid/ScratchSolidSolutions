# Marketing Site → Hetzner Migration Runbook

Migrates the public marketing site (`scratchsolidsolutions.org`) off Cloudflare
Workers/OpenNext onto the Hetzner Docker stack, with **PostgreSQL** as the core
database (per the blueprint), **Redis** for KV, and **R2/S3** for uploads.

## What changed in the code (already done)

- `src/lib/server/pg-d1.ts` — PostgreSQL adapter exposing the D1 interface
  (`prepare().bind().first()/.all()/.run()`) + SQLite→Postgres SQL translation.
- `src/lib/server/redis-kv.ts` — Redis-backed Cloudflare KV-compatible namespaces.
- `src/lib/server/s3-r2.ts` — S3-backed R2Bucket-compatible facade.
- `src/lib/runtime-context.ts` — replacement for `getCloudflareContext()` that
  returns `{ env }` wired to Postgres/Redis/S3. All 9 importers were repointed.
- `next.config.ts` — `output: 'standalone'`; `pg`/`ioredis` marked external.
- `package.json` — added `pg`, `ioredis`, `@types/pg`.
- `Dockerfile` — standalone Next.js image (pre-existing, verified).
- `infra/docker-compose.yml` — `marketing-web` + `marketing-postgres` +
  `marketing-redis` services with Traefik routing for apex + `www`.
- Bug fix: account lockout now stores a real timestamp (was an unevaluated SQL
  literal string, so lockout never triggered).

## Prerequisites

- Hetzner server already running the `infra/docker-compose.yml` stack.
- `wrangler` authenticated locally (for the one-time D1 data export).
- DNS control for `scratchsolidsolutions.org`.

## Step 1 — Export production data from D1

On a machine with `wrangler` access:

```bash
wrangler d1 export scratchsolid-marketing-db --remote --output d1-dump.sql
```

## Step 2 — Convert SQLite dump → PostgreSQL

```bash
node infra/scripts/d1-to-postgres.mjs d1-dump.sql > marketing-postgres.sql
```

The converter keeps `INTEGER` as Postgres `integer` (NOT bigint, which
node-postgres would return as a string and break numeric logic), keeps
timestamps as canonical `TEXT`, drops SQLite triggers (FK `ON DELETE CASCADE`
covers integrity), and rewrites `datetime('now', ...)` / `INSERT OR IGNORE`.

> Review `marketing-postgres.sql` once before loading. If any exotic
> SQLite-only construct slipped through, fix it inline.

## Step 3 — Configure environment

```bash
cd infra
cp .env.example .env   # if not already present
# Fill in: MARKETING_DB_PASSWORD, JWT_SECRET, CSRF_SECRET, RESEND_API_KEY,
#          R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, ZOHO_* etc.
# JWT_SECRET / CSRF_SECRET MUST match the values currently set as Cloudflare
# secrets, or all existing client sessions/tokens are invalidated.
```

## Step 4 — Bring up Postgres + Redis, then load data

```bash
docker compose up -d marketing-postgres marketing-redis

# Wait for healthy, then load the converted schema + data:
docker compose cp ../marketing-postgres.sql marketing-postgres:/tmp/load.sql
docker compose exec marketing-postgres \
  psql -U "$MARKETING_DB_USER" -d "$MARKETING_DB_NAME" -f /tmp/load.sql
```

## Step 5 — Build & start the web container

```bash
docker compose build marketing-web
docker compose up -d marketing-web
docker compose logs -f marketing-web   # watch for clean boot
```

Traefik will request a Let's Encrypt cert for `scratchsolidsolutions.org` once
DNS points at the server (next step).

## Step 6 — DNS cutover

Point the apex + www at the Hetzner IP:

| Record | Type | Target |
|--------|------|--------|
| `scratchsolidsolutions.org` | A | `<server-ip>` |
| `www.scratchsolidsolutions.org` | A/CNAME | `<server-ip>` / apex |

If Cloudflare proxies the zone, set these records to **DNS only (grey cloud)**
for initial Let's Encrypt issuance, or use the Cloudflare origin cert flow.
Remove the old Cloudflare Worker route `scratchsolidsolutions.org/*`.

## Step 7 — Verify

```bash
curl -I https://scratchsolidsolutions.org/
curl -s https://scratchsolidsolutions.org/api/health
# Test: signup, login (JWT), a booking, an image upload (R2), a quote email.
```

## Rollback

The old Cloudflare Worker remains deployed until you delete its route. To roll
back, re-point DNS / restore the Worker route. No data is destroyed on D1 by
this process (export is read-only).

## Open items (tracked separately)

- Verify uncommon SQLite SQL across the 545 query sites against Postgres at
  runtime (smoke-test each API group).
- Decouple from `@opennextjs/cloudflare` package once verified (remove dep and
  the `types/cloudflare-env.d.ts` type import).
