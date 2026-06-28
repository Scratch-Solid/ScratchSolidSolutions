#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ScratchSolid 2.0 — Hetzner Infrastructure Deployment
# Run as root on a fresh Ubuntu 22.04 LTS server (4vCPU/8GB/100GB minimum)
# Usage: sudo ./deploy-stack.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REQUIRED_MEM_KB=$((8 * 1024 * 1024)) # 8GB
REQUIRED_DISK_GB=100

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ScratchSolid 2.0 — Infrastructure Deployment               ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# ─── Pre-flight Checks ───
echo ""
echo "[1/10] Running pre-flight checks..."

if [[ $EUID -ne 0 ]]; then
  echo "❌ ERROR: This script must be run as root (use sudo)"
  exit 1
fi

MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
if [[ $MEM_KB -lt $REQUIRED_MEM_KB ]]; then
  echo "⚠️  WARNING: Detected $(($MEM_KB / 1024 / 1024))GB RAM. Recommended: 8GB+"
  read -p "Continue anyway? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
else
  echo "✅ Memory check passed ($(($MEM_KB / 1024 / 1024))GB)"
fi

DISK_GB=$(df / | tail -1 | awk '{print $4}')
DISK_GB=$((DISK_GB / 1024 / 1024))
if [[ $DISK_GB -lt $REQUIRED_DISK_GB ]]; then
  echo "⚠️  WARNING: Detected ${DISK_GB}GB free disk. Recommended: 100GB+"
else
  echo "✅ Disk check passed (${DISK_GB}GB free)"
fi

# ─── Generate .env if missing ───
if [[ ! -f "$INFRA_DIR/.env" ]]; then
  echo ""
  echo "[2/10] Generating .env file with cryptographically secure secrets..."
  cd "$INFRA_DIR"
  node scripts/generate-env.js > .env
  echo "✅ .env generated at $INFRA_DIR/.env"
  echo "⚠️  IMPORTANT: Edit .env and fill in all [REQUIRED MANUAL] fields before continuing."
  echo "   nano $INFRA_DIR/.env"
  echo ""
  read -p "Press Enter AFTER you have filled in all required manual fields..."
else
  echo "✅ .env already exists"
fi

# Validate required env vars
source "$INFRA_DIR/.env"
MISSING=()
for VAR in CALCOM_DB_PASSWORD CALCOM_NEXTAUTH_SECRET CALCOM_ENCRYPTION_KEY \
           N8N_DB_PASSWORD N8N_ENCRYPTION_KEY N8N_BASIC_AUTH_PASSWORD \
           ERPNEXT_DB_ROOT_PASSWORD RESEND_API_KEY INTERNAL_PORTAL_N8N_WEBHOOK_SECRET; do
  VAL="${!VAR:-}"
  if [[ -z "$VAL" || "$VAL" == "YOUR_"*"_HERE" ]]; then
    MISSING+=("$VAR")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "❌ ERROR: The following required environment variables are missing or unset:"
  printf '   - %s\n' "${MISSING[@]}"
  echo "   Edit $INFRA_DIR/.env and fill them in."
  exit 1
fi
echo "✅ Environment variables validated"

# ─── System Update & Docker Install ───
echo ""
echo "[3/10] Updating system and installing Docker..."
apt-get update -qq
apt-get install -y -qq apt-transport-https ca-certificates curl gnupg lsb-release ufw fail2ban jq

if ! command -v docker &>/dev/null; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

if ! docker compose version &>/dev/null; then
  echo "❌ ERROR: Docker Compose plugin not found. Please install docker-compose-plugin."
  exit 1
fi
echo "✅ Docker Compose plugin available"

# ─── Firewall Configuration ───
echo ""
echo "[4/10] Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "✅ Firewall configured (22, 80, 443)"

# ─── Fail2Ban ───
echo ""
echo "[5/10] Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
EOF
systemctl restart fail2ban
systemctl enable fail2ban
echo "✅ fail2ban configured"

# ─── Unattended Upgrades ───
echo ""
echo "[6/10] Enabling automatic security updates..."
apt-get install -y -qq unattended-upgrades
systemctl enable unattended-upgrades
echo "✅ Unattended upgrades enabled"

# ─── Create Docker Networks ───
echo ""
echo "[7/10] Creating Docker networks..."
docker network inspect scratch_public &>/dev/null || docker network create scratch_public
docker network inspect scratch_internal &>/dev/null || docker network create scratch_internal
echo "✅ Docker networks ready"

# ─── Pull Images & Deploy Core Infrastructure ───
echo ""
echo "[8/10] Pulling images and starting core infrastructure..."
cd "$INFRA_DIR"
docker compose pull --quiet
docker compose up -d --remove-orphans

echo ""
echo "⏳ Waiting for databases to become healthy (this may take 2-3 minutes)..."
sleep 30

# ─── Health Verification ───
echo ""
echo "[9/10] Verifying service health..."
HEALTH_ERRORS=0

check_container() {
  local NAME=$1
  local STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo "none")
  if [[ "$STATUS" == "healthy" || "$STATUS" == "none" ]]; then
    local RUNNING=$(docker inspect --format='{{.State.Running}}' "$NAME" 2>/dev/null || echo "false")
    if [[ "$RUNNING" == "true" ]]; then
      echo "  ✅ $NAME — running"
    else
      echo "  ❌ $NAME — not running"
      HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
    fi
  else
    echo "  ⚠️  $NAME — health: $STATUS"
    HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
  fi
}

for CONTAINER in scratch_traefik calcom_db calcom_engine n8n_db n8n_orchestrator \
                 erpnext_backend erpnext_frontend erpnext_websocket erpnext_db \
                 erpnext_redis_cache erpnext_redis_queue erpnext_redis_socketio \
                 marketing_db marketing_redis portal_db portal_redis \
                 scratch_backup scratch_uptime_kuma; do
  check_container "$CONTAINER"
done

# NOTE: the marketing-web / portal-web Next.js containers are intentionally NOT
# started here. They are gated behind the compose "apps" profile because the
# public site and portal currently run on Cloudflare. Bring up their databases
# (above) so the server is "ready", then perform the cutover deliberately:
#   1. Migrate data:   scripts/migrate-d1-to-postgres.sh <d1-db> <pg-service> <user> <db>
#   2. Build + start:  docker compose --profile apps up -d marketing-web portal-web
#   3. Point DNS for scratchsolidsolutions.org / portal.* at this server.

# ─── ERPNext First-Time Setup ───
echo ""
echo "[10/10] ERPNext first-time site creation (this takes 5-10 minutes)..."
SITE_NAME="${ERPNEXT_SITE_NAME:-scratchsolid.local}"
if docker exec erpnext_backend bench --site "$SITE_NAME" list-apps 2>/dev/null | grep -q frappe; then
  echo "  ✅ ERPNext site '$SITE_NAME' already configured"
else
  echo "  🔄 Creating ERPNext site '$SITE_NAME' (this may take 5-10 minutes)..."
  docker exec erpnext_backend bench new-site "$SITE_NAME" \
    --mariadb-root-password "$ERPNEXT_DB_ROOT_PASSWORD" \
    --admin-password "$ERPNEXT_DB_ROOT_PASSWORD"
  docker exec erpnext_backend bench --site "$SITE_NAME" install-app erpnext
  docker exec erpnext_backend bench --site "$SITE_NAME" enable-scheduler
  echo "  ✅ ERPNext site '$SITE_NAME' created"
fi

# ─── Create Cal.com admin account ───
echo ""
echo "[Optional] Cal.com admin setup:"
echo "  Once Cal.com is running, visit https://booking.scratchsolidsolutions.org/setup"
echo "  and create the first admin account."

# ─── Create n8n owner account ───
echo ""
echo "[Optional] n8n admin setup:"
echo "  Once n8n is running, visit https://n8n.scratchsolidsolutions.org"
echo "  and create the first owner account with:"
echo "    Username: scratchadmin"
echo "    Password: (from .env N8N_BASIC_AUTH_PASSWORD)"

# ─── Summary ───
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
if [[ $HEALTH_ERRORS -eq 0 ]]; then
  echo "║   🎉 All services deployed successfully!                     ║"
else
  echo "║   ⚠️  $HEALTH_ERRORS service(s) need attention.              ║"
fi
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Traefik Dashboard (via SSH tunnel):                         ║"
echo "║    ssh -L 8080:localhost:8080 root@<server-ip>               ║"
echo "║                                                                ║"
echo "║  Cal.com:      https://booking.scratchsolidsolutions.org     ║"
echo "║  n8n:           https://n8n.scratchsolidsolutions.org        ║"
echo "║  ERPNext:       https://erp.scratchsolidsolutions.org        ║"
echo "║  Monitoring:    https://status.scratchsolidsolutions.org     ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                                   ║"
echo "║  1. Point DNS A records to this server's public IP             ║"
echo "║     (booking, n8n, erp, status subdomains)                   ║"
echo "║  2. Set up Uptime Kuma monitors at status.*                   ║"
echo "║  3. Configure Cal.com event types and webhook                   ║"
echo "║  4. Import n8n workflows from infra/n8n-workflows/            ║"
echo "║  5. Generate ERPNext API key for portal integration           ║"
echo "║  6. Run: ./verify.sh for continuous health checks             ║"
echo "║  7. Test backup manually: docker exec scratch_backup /scripts/backup.sh"
echo "╚════════════════════════════════════════════════════════════════╝"

if [[ $HEALTH_ERRORS -gt 0 ]]; then
  exit 1
fi
