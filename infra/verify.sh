#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ScratchSolid 2.0 — Health Check & Verification Script
# Usage: ./verify.sh
#   - ./verify.sh --watch    (continuous monitoring, 30s interval)
#   - ./verify.sh --json     (machine-readable output)
# ═══════════════════════════════════════════════════════════════════

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WATCH_MODE=false
JSON_MODE=false
INTERVAL=30

while [[ $# -gt 0 ]]; do
  case $1 in
    --watch) WATCH_MODE=true; shift ;;
    --json) JSON_MODE=true; shift ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Service Definitions ───
declare -A SERVICES=(
  ["traefik"]="scratch_traefik|exec|wget --spider -q http://localhost:8080/ping|200"
  ["calcom-db"]="calcom_db|exec|pg_isready -U scratch_admin -d calcom|0"
  ["calcom-web"]="calcom_engine|exec|wget --spider -q http://localhost:3000|200"
  ["n8n-db"]="n8n_db|exec|pg_isready -U n8n -d n8n|0"
  ["n8n-web"]="n8n_orchestrator|exec|wget --spider -q http://localhost:5678/healthz|200"
  ["erpnext-backend"]="erpnext_backend|exec|wget --spider -q http://localhost:8000/api/method/ping|200"
  ["erpnext-frontend"]="erpnext_frontend|exec|wget --spider -q http://localhost:8080|200"
  ["erpnext-websocket"]="erpnext_websocket|exec|ps aux | grep -v grep | grep socketio|0"
  ["erpnext-db"]="erpnext_db|exec|mysqladmin ping -h localhost -p${ERPNEXT_DB_ROOT_PASSWORD:-}|0"
  ["erpnext-redis-cache"]="erpnext_redis_cache|exec|redis-cli ping|0"
  ["erpnext-redis-queue"]="erpnext_redis_queue|exec|redis-cli ping|0"
  ["erpnext-redis-socketio"]="erpnext_redis_socketio|exec|redis-cli ping|0"
  ["backup"]="scratch_backup|exec|ps aux | grep -v grep | grep backup|0"
  ["uptime-kuma"]="scratch_uptime_kuma|exec|wget --spider -q http://localhost:3001|200"
)

# ─── Check Functions ───
check_service() {
  local NAME=$1
  local SPEC=$2
  local CONTAINER=$(echo "$SPEC" | cut -d'|' -f1)
  local METHOD=$(echo "$SPEC" | cut -d'|' -f2)
  local TARGET=$(echo "$SPEC" | cut -d'|' -f3)
  local EXPECTED=$(echo "$SPEC" | cut -d'|' -f4)

  local STATUS="unknown"
  local DETAIL=""

  if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    STATUS="missing"
    DETAIL="Container not running"
  else
    case $METHOD in
      exec)
        if docker exec "$CONTAINER" sh -c "$TARGET" &>/dev/null; then
          STATUS="healthy"
        else
          STATUS="unhealthy"
          DETAIL="Exec check failed"
        fi
        ;;
      *)
        STATUS="unknown"
        DETAIL="Unknown check method: $METHOD"
        ;;
    esac
  fi

  echo "$STATUS|$DETAIL"
}

# ─── Run Checks ───
run_checks() {
  local RESULTS=()
  local HEALTHY=0
  local UNHEALTHY=0
  local MISSING=0

  for NAME in "${!SERVICES[@]}"; do
    local RESULT=$(check_service "$NAME" "${SERVICES[$NAME]}")
    local STATUS=$(echo "$RESULT" | cut -d'|' -f1)
    local DETAIL=$(echo "$RESULT" | cut -d'|' -f2-)

    case $STATUS in
      healthy) HEALTHY=$((HEALTHY + 1)) ;;
      unhealthy) UNHEALTHY=$((UNHEALTHY + 1)) ;;
      missing) MISSING=$((MISSING + 1)) ;;
    esac

    RESULTS+=("$NAME|$STATUS|$DETAIL")
  done

  if $JSON_MODE; then
    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"summary\": {"
    echo "    \"healthy\": $HEALTHY,"
    echo "    \"unhealthy\": $UNHEALTHY,"
    echo "    \"missing\": $MISSING,"
    echo "    \"total\": $((${#SERVICES[@]}))"
    echo "  },"
    echo "  \"services\": {"
    local FIRST=true
    for R in "${RESULTS[@]}"; do
      local SNAME=$(echo "$R" | cut -d'|' -f1)
      local SSTAT=$(echo "$R" | cut -d'|' -f2)
      local SDET=$(echo "$R" | cut -d'|' -f3-)
      if ! $FIRST; then echo ","; else FIRST=false; fi
      echo -n "    \"$SNAME\": { \"status\": \"$SSTAT\", \"detail\": \"$SDET\" }"
    done
    echo ""
    echo "  }"
    echo "}"
  else
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   ScratchSolid 2.0 — Health Check Report                     ║"
    echo "║   $(date '+%Y-%m-%d %H:%M:%S %Z')                                    ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    printf "║  %-20s %-12s %-25s ║\n" "Service" "Status" "Detail"
    echo "╠════════════════════════════════════════════════════════════════╣"
    for R in "${RESULTS[@]}"; do
      local SNAME=$(echo "$R" | cut -d'|' -f1)
      local SSTAT=$(echo "$R" | cut -d'|' -f2)
      local SDET=$(echo "$R" | cut -d'|' -f3-)
      local ICON="❓"
      case $SSTAT in
        healthy) ICON="✅" ;;
        unhealthy) ICON="⚠️ " ;;
        missing) ICON="❌" ;;
      esac
      printf "║  %-18s %s %-12s %-22s ║\n" "$SNAME" "$ICON" "$SSTAT" "${SDET:0:22}"
    done
    echo "╠════════════════════════════════════════════════════════════════╣"
    printf "║  Total: %-2d  |  Healthy: %-2d  |  Unhealthy: %-2d  |  Missing: %-2d   ║\n" \
      "${#SERVICES[@]}" "$HEALTHY" "$UNHEALTHY" "$MISSING"
    echo "╚════════════════════════════════════════════════════════════════╝"
  fi

  if [[ $UNHEALTHY -gt 0 || $MISSING -gt 0 ]]; then
    return 1
  fi
  return 0
}

# ─── Main Execution ───
if $WATCH_MODE; then
  echo "👁️  Watch mode enabled (interval: ${INTERVAL}s). Press Ctrl+C to stop."
  echo ""
  while true; do
    run_checks
    echo ""
    sleep "$INTERVAL"
  done
else
  run_checks
fi
