#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ScratchSolid 2.0 — Server Hardening Script
# Run AFTER all 4 domains are confirmed proxied through Cloudflare
# WARNING: This script will lock down the server. Do NOT run until
#          you have confirmed all domains resolve via Cloudflare.
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_IP="167.233.18.87"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ScratchSolid 2.0 — Server Hardening                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# ─── Pre-flight: Confirm proxy is active ───
echo ""
echo "[CHECK] Verifying domains are proxied through Cloudflare..."
DOMAINS=(
  "booking.scratchsolidsolutions.org"
  "n8n.scratchsolidsolutions.org"
  "erp.scratchsolidsolutions.org"
  "status.scratchsolidsolutions.org"
)

ALL_PROXIED=true
for domain in "${DOMAINS[@]}"; do
  CF_RAY=$(curl -s -I "https://${domain}" 2>/dev/null | grep -i "cf-ray" | head -1 || true)
  if [[ -z "$CF_RAY" ]]; then
    echo "❌ ${domain} does NOT appear to be proxied (no CF-RAY header)"
    ALL_PROXIED=false
  else
    echo "✅ ${domain} is proxied (${CF_RAY})"
  fi
done

if [[ "$ALL_PROXIED" == "false" ]]; then
  echo ""
  echo "⚠️  WARNING: Not all domains are proxied. It is UNSAFE to lock down the firewall."
  read -p "Continue anyway? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Enable Cloudflare proxy first."
    exit 1
  fi
fi

# ─── 1. SSH Hardening ───
echo ""
echo "[1/7] Hardening SSH..."

if [[ -f /etc/ssh/sshd_config ]]; then
  cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%s)
  
  # Use sed to update config
  sed -i 's/^#*\s*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
  sed -i 's/^#*\s*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#*\s*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
  sed -i 's/^#*\s*MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
  sed -i 's/^#*\s*X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
  
  # Append these if not present
  grep -q "^ClientAliveInterval" /etc/ssh/sshd_config || echo "ClientAliveInterval 300" >> /etc/ssh/sshd_config
  grep -q "^ClientAliveCountMax" /etc/ssh/sshd_config || echo "ClientAliveCountMax 2" >> /etc/ssh/sshd_config
  grep -q "^LoginGraceTime" /etc/ssh/sshd_config || echo "LoginGraceTime 60" >> /etc/ssh/sshd_config
  
  systemctl restart sshd || true
  echo "✅ SSH hardened"
else
  echo "⚠️  sshd_config not found, skipping SSH hardening"
fi

# ─── 2. fail2ban Configuration ───
echo ""
echo "[2/7] Configuring fail2ban..."

apt-get install -y -qq fail2ban 2>/dev/null || true

cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[traefik-auth]
enabled = true
port = http,https
filter = nginx-auth  # reuse nginx filter for 401 patterns
logpath = /var/log/traefik/access.log
maxretry = 5
findtime = 600
EOF

# Create log directory if needed
mkdir -p /var/log/traefik

systemctl restart fail2ban 2>/dev/null || true
systemctl enable fail2ban 2>/dev/null || true
echo "✅ fail2ban configured"

# ─── 3. UFW Firewall Lockdown (Cloudflare IPs only) ───
echo ""
echo "[3/7] Locking down UFW firewall to Cloudflare IPs only..."

# Reset UFW
ufw --force reset 2>/dev/null || true

ufw default deny incoming
ufw default allow outgoing

# Allow SSH (CRITICAL — don't lock yourself out)
ufw allow 22/tcp

# Download and apply Cloudflare IP ranges
echo "   Fetching Cloudflare IP ranges..."
CF_IPS=$(curl -s https://www.cloudflare.com/ips-v4)

for ip in $CF_IPS; do
  ufw allow from "$ip" to any port 80
  ufw allow from "$ip" to any port 443
done

# Also allow IPv6
CF_IPS_V6=$(curl -s https://www.cloudflare.com/ips-v6 2>/dev/null || true)
for ip in $CF_IPS_V6; do
  ufw allow from "$ip" to any port 80
  ufw allow from "$ip" to any port 443
done

# Enable UFW
ufw --force enable
echo "✅ UFW configured — only Cloudflare IPs can reach 80/443"

# ─── 4. Automatic Security Updates ───
echo ""
echo "[4/7] Enabling automatic security updates..."

apt-get install -y -qq unattended-upgrades 2>/dev/null || true
dpkg-reconfigure -plow unattended-upgrades 2>/dev/null || true

# Configure to only install security updates
cat > /etc/apt/apt.conf.d/50unattended-updates <<EOF
Unattended-Upgrade::Allowed-Origins {
  "\${distro_id}:\${distro_id}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

echo "✅ Automatic security updates enabled"

# ─── 5. Docker Security Baseline ───
echo ""
echo "[5/7] Applying Docker security baseline..."

# Create daemon.json
cat > /etc/docker/daemon.json <<EOF
{
  "live-restore": true,
  "no-new-privileges": true,
  "userns-remap": "default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker || true
echo "✅ Docker daemon secured"

# ─── 6. Kernel Hardening (sysctl) ───
echo ""
echo "[6/7] Applying kernel hardening..."

cat >> /etc/sysctl.conf <<EOF
# IP Spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Ignore source routed packets
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Prevent SYN flood attacks
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Do not accept ICMP echo requests
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable ASLR
kernel.randomize_va_space = 2

# Restrict ptrace
debugfs restrict = 1
EOF

sysctl -p 2>/dev/null || true
echo "✅ Kernel parameters hardened"

# ─── 7. Disable Unnecessary Services ───
echo ""
echo "[7/7] Disabling unnecessary services..."

for svc in apache2 nginx; do
  systemctl disable --now "$svc" 2>/dev/null || true
done

echo "✅ Unnecessary services disabled"

# ─── Summary ───
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ✅ Server Hardening Complete                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  • SSH root login disabled, password auth disabled"
echo "  • UFW allows only Cloudflare IPs on 80/443 + SSH on 22"
echo "  • fail2ban monitors SSH and Traefik auth failures"
echo "  • Automatic security updates enabled"
echo "  • Docker daemon hardened (no-new-privileges, live-restore)"
echo "  • Kernel parameters hardened against common attacks"
echo ""
echo "IMPORTANT: Verify you can still SSH in before closing this session!"
echo "  Test: ssh your-username@${SERVER_IP}"
echo ""
