#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ScratchSolid — D1 → PostgreSQL migration helper
# ───────────────────────────────────────────────────────────────────
# Exports a Cloudflare D1 database, converts the SQLite dump to
# PostgreSQL with scripts/d1-to-postgres.mjs, and loads it into a
# Postgres container managed by infra/docker-compose.yml.
#
# Idempotency: loading is guarded — if the target Postgres database
# already contains user tables, the script refuses to reload unless
# FORCE=1 is set (prevents clobbering live data on re-runs).
#
# Requirements on the machine running this:
#   - wrangler (authenticated, or CLOUDFLARE_API_TOKEN exported)
#   - node (for the converter)
#   - docker compose (the target Postgres service must be running)
#
# Usage:
#   ./migrate-d1-to-postgres.sh <d1-db-name> <compose-service> <pg-user> <pg-db>
#
# Examples (run from infra/):
#   scripts/migrate-d1-to-postgres.sh scratchsolid-portal-db    portal-postgres    portal    portal
#   scripts/migrate-d1-to-postgres.sh scratchsolid-training-db  portal-postgres    portal    portal
#   scripts/migrate-d1-to-postgres.sh scratchsolid-marketing-db marketing-postgres marketing marketing
#
# NOTE: training tables are intentionally loaded into the SAME portal
# Postgres database (the portal-web container points both scratchsolid_db
# and training_db at DATABASE_URL — see docker-compose.yml).
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

D1_NAME="${1:-}"
PG_SERVICE="${2:-}"
PG_USER="${3:-}"
PG_DB="${4:-}"
FORCE="${FORCE:-0}"

if [[ -z "$D1_NAME" || -z "$PG_SERVICE" || -z "$PG_USER" || -z "$PG_DB" ]]; then
  echo "Usage: $0 <d1-db-name> <compose-service> <pg-user> <pg-db>" >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
DUMP_SQL="$WORK_DIR/${D1_NAME}.d1.sql"
PG_SQL="$WORK_DIR/${D1_NAME}.pg.sql"
trap 'rm -rf "$WORK_DIR"' EXIT

cd "$INFRA_DIR"

echo "──────────────────────────────────────────────────────────────"
echo "  D1 → PostgreSQL migration"
echo "    D1 source : $D1_NAME"
echo "    PG target : service=$PG_SERVICE db=$PG_DB user=$PG_USER"
echo "──────────────────────────────────────────────────────────────"

# ─── Pre-flight ───
command -v wrangler >/dev/null 2>&1 || { echo "❌ wrangler not found in PATH" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ node not found in PATH" >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ docker compose not available" >&2; exit 1; }

if ! docker compose ps --services --status running | grep -qx "$PG_SERVICE"; then
  echo "❌ Postgres service '$PG_SERVICE' is not running. Start it first:" >&2
  echo "     docker compose up -d $PG_SERVICE" >&2
  exit 1
fi

# ─── Guard: refuse to clobber a populated database ───
EXISTING_TABLES="$(docker compose exec -T "$PG_SERVICE" \
  psql -U "$PG_USER" -d "$PG_DB" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d '[:space:]' || echo 0)"

if [[ "${EXISTING_TABLES:-0}" -gt 0 && "$FORCE" != "1" ]]; then
  echo "⚠️  Target '$PG_DB' already has $EXISTING_TABLES public table(s)."
  echo "    Refusing to reload to avoid clobbering data. Re-run with FORCE=1 to override."
  exit 2
fi

# ─── Step 1: export from D1 (remote / production) ───
echo "[1/3] Exporting D1 '$D1_NAME' (remote)…"
wrangler d1 export "$D1_NAME" --remote --output "$DUMP_SQL"
echo "      → $(wc -l < "$DUMP_SQL") lines"

# ─── Step 2: convert SQLite → PostgreSQL ───
echo "[2/3] Converting to PostgreSQL…"
node "$SCRIPT_DIR/d1-to-postgres.mjs" "$DUMP_SQL" > "$PG_SQL"
echo "      → $(wc -l < "$PG_SQL") lines"

# ─── Step 3: load into Postgres ───
echo "[3/3] Loading into '$PG_DB'…"
docker compose cp "$PG_SQL" "$PG_SERVICE:/tmp/load.sql"
docker compose exec -T "$PG_SERVICE" psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 -f /tmp/load.sql
docker compose exec -T "$PG_SERVICE" rm -f /tmp/load.sql

echo "✅ Migration complete: $D1_NAME → $PG_SERVICE/$PG_DB"
