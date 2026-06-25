#!/bin/bash
# =============================================================================
# ScratchSolid Hetzner Server Full Audit
# Run this on the server to see exactly what is running, partial, or missing.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS="${GREEN}PASS${NC}"
FAIL="${RED}FAIL${NC}"
WARN="${YELLOW}WARN${NC}"

echo "═══════════════════════════════════════════════════════════════════════"
echo "  ScratchSolid Hetzner Server Audit"
echo "  Generated: $(date -Iseconds)"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# ─── 1. DOCKER COMPOSE STATUS ───
echo "[1] Docker Compose Services"
echo "───────────────────────────────────────────────────────────────────────"
cd /opt/ScratchSolidSolutions/infra 2>/dev/null || cd ~/ScratchSolidSolutions/infra 2>/dev/null || {
    echo -e "${FAIL} infra directory not found"
    exit 1
}

docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker-compose ps 2>/dev/null || echo -e "${FAIL} docker compose not available"
echo ""

# ─── 2. ENV FILE CHECK ───
echo "[2] Environment Variables (.env completeness)"
echo "───────────────────────────────────────────────────────────────────────"
if [ -f .env ]; then
    TOTAL=$(grep -cE '^[A-Z_]+=' .env 2>/dev/null || echo 0)
    EMPTY=$(grep -cE '^[A-Z_]+=<.*>$' .env 2>/dev/null || echo 0)
    PLACEHOLDER=$(grep -cE '^[A-Z_]+=$' .env 2>/dev/null || echo 0)
    echo -e "Total vars: ${TOTAL} | Empty placeholders: ${EMPTY} | Blank values: ${PLACEHOLDER}"
    if [ "$EMPTY" -gt 0 ] || [ "$PLACEHOLDER" -gt 0 ]; then
        echo -e "${WARN} Some variables are not filled:"
        grep -E '^[A-Z_]+=<.*>$|^[A-Z_]+=$' .env | head -20
    else
        echo -e "${PASS} All variables appear filled"
    fi
else
    echo -e "${FAIL} .env file missing — copy from .env.example and fill ALL secrets"
fi
echo ""

# ─── 3. DATABASE HEALTH ───
echo "[3] PostgreSQL Databases"
echo "───────────────────────────────────────────────────────────────────────"
for db in marketing-postgres portal-postgres calcom-postgres n8n-postgres; do
    if docker exec "$db" pg_isready -U postgres 2>/dev/null; then
        echo -e "${PASS} $db: accepting connections"
    else
        echo -e "${FAIL} $db: NOT responding"
    fi
done
echo ""

# ─── 4. REDIS HEALTH ───
echo "[4] Redis Instances"
echo "───────────────────────────────────────────────────────────────────────"
for redis in marketing-redis portal-redis erpnext-redis-cache erpnext-redis-queue; do
    if docker exec "$redis" redis-cli ping 2>/dev/null | grep -q PONG; then
        echo -e "${PASS} $redis: PONG"
    else
        echo -e "${FAIL} $redis: NOT responding"
    fi
done
echo ""

# ─── 5. CAL.COM ───
echo "[5] Cal.com"
echo "───────────────────────────────────────────────────────────────────────"
if docker exec calcom_engine curl -sf http://localhost:3000/api/health 2>/dev/null | grep -q ok; then
    echo -e "${PASS} Cal.com web: healthy"
else
    echo -e "${FAIL} Cal.com web: health check failed"
fi
if docker exec calcom_postgres pg_isready -U scratch_admin 2>/dev/null; then
    echo -e "${PASS} Cal.com DB: accepting connections"
else
    echo -e "${FAIL} Cal.com DB: NOT responding"
fi
echo ""

# ─── 6. N8N ───
echo "[6] n8n"
echo "───────────────────────────────────────────────────────────────────────"
if curl -sf http://localhost:5678/rest/health 2>/dev/null | grep -q ok; then
    echo -e "${PASS} n8n: healthy"
else
    echo -e "${FAIL} n8n: health check failed"
fi
if docker exec n8n_postgres pg_isready -U n8n 2>/dev/null; then
    echo -e "${PASS} n8n DB: accepting connections"
else
    echo -e "${FAIL} n8n DB: NOT responding"
fi
echo ""

# ─── 7. ERPNEXT ───
echo "[7] ERPNext"
echo "───────────────────────────────────────────────────────────────────────"
if docker exec erpnext_backend bench --site scratchsolid.local list-apps 2>/dev/null | grep -q frappe; then
    echo -e "${PASS} ERPNext site 'scratchsolid.local': installed"
else
    echo -e "${FAIL} ERPNext site 'scratchsolid.local': NOT found — run deploy-stack.sh site creation step"
fi
if docker exec erpnext_db mysqladmin ping 2>/dev/null | grep -q alive; then
    echo -e "${PASS} ERPNext MariaDB: alive"
else
    echo -e "${FAIL} ERPNext MariaDB: NOT responding"
fi
echo ""

# ─── 8. TRAEFIK / SSL ───
echo "[8] Traefik / SSL Certificates"
echo "───────────────────────────────────────────────────────────────────────"
if curl -sf http://localhost:8080/api/rawdata 2>/dev/null | grep -q routers; then
    echo -e "${PASS} Traefik API: responding"
else
    echo -e "${FAIL} Traefik API: NOT responding"
fi
for domain in n8n.scratchsolidsolutions.org booking.scratchsolidsolutions.org erp.scratchsolidsolutions.org; do
    expiry=$(curl -vI "https://$domain" 2>&1 | grep -i "expire date" | head -1 || echo "")
    if [ -n "$expiry" ]; then
        echo -e "${PASS} $domain: SSL valid ($expiry)"
    else
        echo -e "${WARN} $domain: SSL status unknown (may need DNS + Traefik LE challenge)"
    fi
done
echo ""

# ─── 9. BACKUP CONTAINER ───
echo "[9] R2 Backup"
echo "───────────────────────────────────────────────────────────────────────"
if docker ps --format '{{.Names}}' | grep -q backup; then
    echo -e "${PASS} Backup container: running"
else
    echo -e "${WARN} Backup container: not running (check compose profile or .env)"
fi
echo ""

# ─── 10. MARKETING / PORTAL APPS (profile "apps") ───
echo "[10] Marketing + Portal Web Apps (compose profile 'apps')"
echo "───────────────────────────────────────────────────────────────────────"
if docker ps --format '{{.Names}}' | grep -q marketing-web; then
    echo -e "${PASS} marketing-web: running"
else
    echo -e "${WARN} marketing-web: NOT running (cutover not done — expected)"
fi
if docker ps --format '{{.Names}}' | grep -q portal-web; then
    echo -e "${PASS} portal-web: running"
else
    echo -e "${WARN} portal-web: NOT running (cutover not done — expected)"
fi
echo ""

# ─── SUMMARY ───
echo "═══════════════════════════════════════════════════════════════════════"
echo "  SUMMARY"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "CRITICAL FIXES NEEDED (if any FAIL above):"
echo "  - ERPNext site creation:  run deploy-stack.sh or bench new-site"
echo "  - Missing .env secrets:   fill ALL placeholders in .env"
echo "  - Postgres not starting:  check docker logs <container>"
echo "  - Traefik not routing:    check docker logs scratch_traefik"
echo ""
echo "OPTIONAL / FUTURE:"
echo "  - marketing-web + portal-web cutover (gated behind 'apps' profile)"
echo "  - D1 -> Postgres data migration before cutover"
echo ""
