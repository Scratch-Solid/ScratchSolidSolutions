# Production Status & Runbook — Scratch Solid Solutions
_Authoritative snapshot. Last updated: 2026-06-16._

This is the single source of truth for "what is actually running, what is fixed,
and what still needs a human with dashboard/server access." It supersedes the
older scattered `*_AUDIT_*.md` / `*_COMPLETION_*.md` files at the repo root.

---

## 1. Live production status (verified via HTTP)

| Service | URL | Hosting | Status |
|---|---|---|---|
| Marketing site | `scratchsolidsolutions.org` | **Cloudflare Workers** (OpenNext) + D1 | ✅ Healthy |
| Backend API | `api.scratchsolidsolutions.org` | Cloudflare Worker | ⚠️ Up; **Zoho token expired** |
| Internal Portal | `portal.scratchsolidsolutions.org` | **Cloudflare Workers** (OpenNext) + D1 | ❌ Was DB-down → **code fix applied, needs deploy** |
| n8n | `n8n.scratchsolidsolutions.org` | Hetzner (Docker) | ✅ Live |
| Cal.com | `booking.scratchsolidsolutions.org` | Hetzner (Docker) | ⚠️ Live but **not onboarded** (setup wizard) |
| ERPNext | `erp.scratchsolidsolutions.org` | Hetzner (Docker) | ❌ **Not reachable** (site not created) |
| Uptime Kuma | `status.scratchsolidsolutions.org` | Hetzner (Docker) | ✅ Live |

**Key architecture fact:** marketing + portal + backend all run on **Cloudflare**.
Only the operational tools (Cal.com, n8n, ERPNext, Uptime Kuma) run on the
Hetzner Docker stack today. The Hetzner stack is *also* fully prepared to host
marketing + portal (Postgres/Redis/web), but that cutover has **not** happened.

---

## 2. Root cause of the portal outage (FIXED in code)

`internal-portal/src/lib/runtime-context.ts` had been replaced with a
**Postgres-only** "drop-in" for Hetzner. But the portal is still deployed on
**Cloudflare Workers**, where there is no Postgres — so every DB call failed with
`proxy request failed, cannot connect to the specified address`, taking the whole
portal offline (login, admin, cleaner, onboarding).

**Fix applied:** rewrote `runtime-context.ts` to be **universal/dual-mode** (the
same pattern the healthy marketing site already uses):
1. On Cloudflare Workers → use the real `@opennextjs/cloudflare` D1/KV/R2 bindings.
2. On Hetzner/standalone → fall back to PostgreSQL/Redis/S3.

This restores the portal on the existing Cloudflare + D1 (with all existing data)
and simultaneously keeps the Hetzner path working for a future cutover.
- Verified: `npm test` in `internal-portal` → **23 suites / 121 tests pass**.

### ⚠️ ACTION REQUIRED (you): deploy the portal
The fix is committed but **not yet live** — it needs a deploy to Cloudflare:
```bash
# Option A — via GitHub Actions (recommended): trigger "Deploy to Production"
#   (workflow_dispatch) or push a version tag:
git tag v2.0.1 && git push origin v2.0.1

# Option B — local deploy (requires CLOUDFLARE_API_TOKEN in env):
cd internal-portal && npm run deploy
```
After deploy, confirm: `https://portal.scratchsolidsolutions.org/api/health`
should show `database: healthy`.

---

## 3. Hetzner — prepared & ready (no cutover performed)

The Docker stack (`infra/docker-compose.yml`) already defines everything needed
to host marketing + portal on Hetzner. Changes made so the server is "ready"
without risking the live Cloudflare apps:

- **`marketing-web` / `portal-web` gated behind the `apps` compose profile.**
  Default `docker compose up -d` now brings up infra + **Postgres + Redis for
  both apps** (ready state) but does **not** build/start the heavy Next.js
  containers or cut traffic over.
- **`infra/scripts/migrate-d1-to-postgres.sh`** (new) — idempotent D1→Postgres
  migration (export → convert via `d1-to-postgres.mjs` → load), with a guard that
  refuses to clobber a populated DB unless `FORCE=1`.
- **`infra/scripts/deploy-stack.sh`** — health checks now include
  `marketing_db / marketing_redis / portal_db / portal_redis`, plus inline
  cutover instructions.

### Future cutover procedure (when you choose to move portal/marketing to Hetzner)
Run on the server (has `wrangler` auth + the repo):
```bash
cd infra
sudo ./scripts/deploy-stack.sh                      # infra + DBs ready
# Migrate data (portal + training share the portal Postgres):
./scripts/migrate-d1-to-postgres.sh scratchsolid-portal-db    portal-postgres    portal    portal
./scripts/migrate-d1-to-postgres.sh scratchsolid-training-db  portal-postgres    portal    portal
./scripts/migrate-d1-to-postgres.sh scratchsolid-marketing-db marketing-postgres marketing marketing
# Build + start the apps, then point DNS at the server:
docker compose --profile apps up -d marketing-web portal-web
```
Then in `.github/workflows/deploy-production.yml`, disable the Cloudflare deploy
jobs for marketing/portal so a tag push can't re-attach the Worker routes and
clobber the Hetzner origin. (Left intact for now since the apps still live on CF.)

---

## 4. Issues requiring YOUR dashboard access (cannot be automated)

| # | Issue | Where | Action |
|---|---|---|---|
| 1 | **Zoho token expired** | Backend API health `zoho: token_expired` | Re-run Zoho OAuth, update `ZOHO_REFRESH_TOKEN` secret (backend worker + portal). Invoicing/payments fail until then. |
| 2 | **Cal.com not onboarded** | `booking.*` shows setup wizard | Create first admin at `/setup`; configure event types + booking webhook → n8n. |
| 3 | **ERPNext site missing** | `erp.*` returns Not Found | On server: `deploy-stack.sh` auto-creates the site; or `docker exec erpnext_backend bench new-site …`. Then generate API key → set `ERPNEXT_*` secrets. |
| 4 | **WhatsApp/Meta not configured** | Portal health `meta_cloud_api: not configured` | Set `META_*` secrets; currently falls back to email. |
| 5 | **n8n workflows** | `infra/n8n-workflows/*.json` | Import the 6 workflow JSONs into n8n and set credentials. |

---

## 5. Verified safe / non-issues (checked, no action needed)

- **Portal `seed`, `seed-users`, `test` endpoints** — already guarded with
  `NODE_ENV === 'production'` → 403/404. Not exploitable in prod.
- **Marketing `test-db`, `test-email`, `quote-test`, `seed-services` dirs** —
  empty (no `route.ts`); not deployed as endpoints.
- **`pg-d1` `batch()` non-atomic transaction** — real but **dormant**: no callers
  in the portal. Fix before first use (make statements run on the txn client).

---

## 6. Lower-priority cleanup (recommended, not blocking)

- **Stale `README.md`** — says "Cloudflare Pages / Next.js 16 for both"; reality is
  OpenNext **Workers**, portal on Next 15. Update.
- **Repo clutter** — ~30 overlapping `*_AUDIT_*` / `*_COMPLETION_*` `.md` files,
  plus `tsc-*.txt`, `test_*.json/.bat`, loose `*.sql` dumps at root. Archive/remove.

---

## 7. Change log (this session)
- `internal-portal/src/lib/runtime-context.ts` — universal dual-mode (portal outage fix).
- `infra/docker-compose.yml` — `marketing-web` / `portal-web` gated behind `apps` profile.
- `infra/scripts/migrate-d1-to-postgres.sh` — new idempotent D1→PG migration helper.
- `infra/scripts/deploy-stack.sh` — health checks include app DBs/Redis + cutover notes.
