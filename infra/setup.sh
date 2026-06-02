#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ScratchSolid 2.0 — One-Command Infrastructure Bootstrap
# Run as root on a fresh Ubuntu 22.04 LTS server
# Usage: sudo ./setup.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_MEM_KB=$((8 * 1024 * 1024)) # 8GB
REQUIRED_DISK_GB=100

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ScratchSolid 2.0 — Infrastructure Bootstrap              ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# ─── Pre-flight Checks ───
echo ""
echo "[1/7] Running pre-flight checks..."

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

if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
  echo "❌ ERROR: .env file not found. Please copy .env.example and fill in secrets:"
  echo "   cp .env.example .env && nano .env"
  exit 1
fi

# Validate required env vars
source "$SCRIPT_DIR/.env"
MISSING=()
for VAR in CALCOM_DB_PASSWORD CALCOM_NEXTAUTH_SECRET CALCOM_ENCRYPTION_KEY \
           N8N_DB_PASSWORD N8N_ENCRYPTION_KEY N8N_BASIC_AUTH_PASSWORD \
           ERPNEXT_DB_ROOT_PASSWORD RESEND_API_KEY INTERNAL_PORTAL_N8N_WEBHOOK_SECRET; do
  VAL="${!VAR:-}"
  if [[ -z "$VAL" || "$VAL" == "<"*">" ]]; then
    MISSING+=("$VAR")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "❌ ERROR: The following required environment variables are missing or unset:"
  printf '   - %s\n' "${MISSING[@]}"
  exit 1
fi
echo "✅ Environment variables validated"

# ─── System Update & Docker Install ───
echo ""
echo "[2/7] Updating system and installing Docker..."
apt-get update -qq
apt-get install -y -qq apt-transport-https ca-certificates curl gnupg lsb-release ufw fail2ban

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

# ─── Docker Compose Plugin Check ───
if ! docker compose version &>/dev/null; then
  echo "❌ ERROR: Docker Compose plugin not found. Please install docker-compose-plugin."
  exit 1
fi
echo "✅ Docker Compose plugin available"

# ─── Firewall Configuration ───
echo ""
echo "[3/7] Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (Traefik redirect)
ufw allow 443/tcp  # HTTPS
ufw --force enable
echo "✅ Firewall configured (22, 80, 443)"

# ─── Fail2Ban ───
echo ""
echo "[4/7] Configuring fail2ban..."
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
echo "[5/7] Enabling automatic security updates..."
apt-get install -y -qq unattended-upgrades
systemctl enable unattended-upgrades
echo "✅ Unattended upgrades enabled"

# ─── Create Docker Networks ───
echo ""
echo "[6/7] Creating Docker networks..."
docker network inspect scratch_public &>/dev/null || docker network create scratch_public
docker network inspect scratch_internal &>/dev/null || docker network create scratch_internal
echo "✅ Docker networks ready"

# ─── Pull Images & Deploy ───
echo ""
echo "[7/7] Pulling images and starting services..."
cd "$SCRIPT_DIR"
docker compose pull --quiet
docker compose up -d --remove-orphans

echo ""
echo "⏳ Waiting for services to become healthy (this may take 2-3 minutes)..."
sleep 30

# ─── Health Verification ───
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
                 erpnext_redis_cache erpnext_redis_queue erpnext_redis_socketio; do
  check_container "$CONTAINER"
done

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
echo "║  Cal.com:     https://booking.scratchsolidsolutions.org      ║"
echo "║  n8n:          https://n8n.scratchsolidsolutions.org         ║"
echo "║  ERPNext:      https://erp.scratchsolidsolutions.org         ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                                   ║"
echo "║  1. Point DNS A records to this server's public IP             ║"
echo "║  2. Configure Cal.com event types and webhook                  ║"
echo "║  3. Set up n8n workflows                                      ║"
echo "║  4. Run: ./verify.sh for continuous health checks             ║"
echo "╚════════════════════════════════════════════════════════════════╝"

if [[ $HEALTH_ERRORS -gt 0 ]]; then
  exit 1
fi
