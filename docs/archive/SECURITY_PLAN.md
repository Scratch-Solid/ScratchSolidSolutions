# ScratchSolid 2.0 — Production Security & Hardening Plan
**Date:** June 5, 2026
**Status:** IN PROGRESS
**Objective:** Secure all domains, server, databases, and connections for production readiness

---

## Phase 1: Domain & DNS Security (Critical)

### 1.1 Enable Cloudflare Proxy on 4 Unproxied Records

The following A records point directly to origin IP `167.233.18.87` without Cloudflare proxy:

| Domain | Current | Target | Action |
|--------|---------|--------|--------|
| `booking.scratchsolidsolutions.org` | DNS only | Proxied | Toggle orange cloud ON |
| `n8n.scratchsolidsolutions.org` | DNS only | Proxied | Toggle orange cloud ON |
| `erp.scratchsolidsolutions.org` | DNS only | Proxied | Toggle orange cloud ON |
| `status.scratchsolidsolutions.org` | DNS only | Proxied | Toggle orange cloud ON |

**Why this matters:** Without the orange cloud, traffic bypasses Cloudflare's WAF, DDoS protection, SSL termination, and bot management. The origin IP is exposed to the public internet.

**Implementation Steps:**
1. Log into Cloudflare Dashboard → `scratchsolidsolutions.org`
2. Navigate to DNS → Records
3. Find each A record above
4. Click the grey cloud → it turns orange (Proxied)
5. Wait 60 seconds for propagation

**Post-Proxy Configuration Required:**
- Add Page Rules for each subdomain (or use Cloudflare Ruleset API)
- Configure SSL/TLS mode: "Full (strict)" for all 4 subdomains
- Enable Always Use HTTPS
- Enable Automatic HTTPS Rewrites
- Configure Origin CA certificates for Traefik → Cloudflare origin pull

### 1.2 Server Firewall Lockdown After Proxy Enablement

Once all 4 domains are proxied, lock down the VPS firewall to accept only Cloudflare IPs:

```bash
# On the Ubuntu server (167.233.18.87)
# After confirming proxy is active:

# 1. Download Cloudflare IP ranges
CLOUDFLARE_IPS=$(curl -s https://www.cloudflare.com/ips-v4)

# 2. Reset UFW to default deny
sudo ufw reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 3. Allow SSH (keep this or you'll lock yourself out!)
sudo ufw allow 22/tcp

# 4. Allow Cloudflare IPs only for 80/443
for ip in $CLOUDFLARE_IPS; do
    sudo ufw allow from "$ip" to any port 80
    sudo ufw allow from "$ip" to any port 443
done

# 5. Enable UFW
sudo ufw enable
```

**Important:** Do NOT run this until you've confirmed all 4 domains resolve through Cloudflare (test with `curl -I https://booking.scratchsolidsolutions.org` and verify `CF-RAY` header).

---

## Phase 2: Secret Management (Critical)

### 2.1 Production Secrets Injection

All secrets must be set via Wrangler for each Worker/Project. Below are the exact commands.

**Project 1: cleaning-service-backend (backend-worker)**
```bash
cd backend-worker
npx wrangler secret put JWT_SECRET --name cleaning-service-backend
# Value: ca2339654822ea96b5284d2515bddb3ea9f2a8731e93560b3091e18706fb2389a66cff5b67f7f4262248b2da6f87e37448d274827a2f3ec930180a505e7b7f1b

npx wrangler secret put CSRF_SECRET --name cleaning-service-backend
# Value: 63b9252f0c70c130332b6f71a1cbe9fabd5702d8334c380237d48cd745ef2b05ff116e86545cfbff09114117e42ed552c5362c0a2aebecf5cc0fbe8185e5565a

npx wrangler secret put RESEND_API_KEY --name cleaning-service-backend
npx wrangler secret put ZOHO_CLIENT_SECRET --name cleaning-service-backend
npx wrangler secret put ZOHO_ORG_ID --name cleaning-service-backend
npx wrangler secret put ZOHO_REFRESH_TOKEN --name cleaning-service-backend
npx wrangler secret put INTERNAL_PORTAL_N8N_WEBHOOK_SECRET --name cleaning-service-backend
```

**Project 2: scratchsolidsolutions (marketing-site)**
```bash
cd marketing-site
npx wrangler secret put JWT_SECRET --name scratchsolidsolutions
# Value: ca2339654822ea96b5284d2515bddb3ea9f2a8731e93560b3091e18706fb2389a66cff5b67f7f4262248b2da6f87e37448d274827a2f3ec930180a505e7b7f1b

npx wrangler secret put CSRF_SECRET --name scratchsolidsolutions
# Value: 63b9252f0c70c130332b6f71a1cbe9fabd5702d8334c380237d48cd745ef2b05ff116e86545cfbff09114117e42ed552c5362c0a2aebecf5cc0fbe8185e5565a

npx wrangler secret put RESEND_API_KEY --name scratchsolidsolutions
npx wrangler secret put ZOHO_CLIENT_SECRET --name scratchsolidsolutions
npx wrangler secret put ZOHO_ORG_ID --name scratchsolidsolutions
npx wrangler secret put ZOHO_REFRESH_TOKEN --name scratchsolidsolutions
```

**Project 3: scratchsolid-portal (internal-portal)**
```bash
cd internal-portal
npx wrangler secret put JWT_SECRET --name scratchsolid-portal
# Value: ca2339654822ea96b5284d2515bddb3ea9f2a8731e93560b3091e18706fb2389a66cff5b67f7f4262248b2da6f87e37448d274827a2f3ec930180a505e7b7f1b

npx wrangler secret put CSRF_SECRET --name scratchsolid-portal
# Value: 63b9252f0c70c130332b6f71a1cbe9fabd5702d8334c380237d48cd745ef2b05ff116e86545cfbff09114117e42ed552c5362c0a2aebecf5cc0fbe8185e5565a

npx wrangler secret put RESEND_API_KEY --name scratchsolid-portal
npx wrangler secret put ZOHO_CLIENT_SECRET --name scratchsolid-portal
npx wrangler secret put ZOHO_ORG_ID --name scratchsolid-portal
npx wrangler secret put ZOHO_REFRESH_TOKEN --name scratchsolid-portal
npx wrangler secret put META_ACCESS_TOKEN --name scratchsolid-portal
npx wrangler secret put META_PHONE_NUMBER_ID --name scratchsolid-portal
npx wrangler secret put META_VERIFY_TOKEN --name scratchsolid-portal
npx wrangler secret put INTERNAL_PORTAL_N8N_WEBHOOK_SECRET --name scratchsolid-portal
```

### 2.2 Duplicate Secret Cleanup (ERPNext)

Remove duplicate `ERPNext_API_KEY` / `ERPNEXT_API_KEY` and standardize on `ERPNext_API_KEY`.

Check current secrets:
```bash
npx wrangler secret list --name cleaning-service-backend
npx wrangler secret list --name scratchsolidsolutions
npx wrangler secret list --name scratchsolid-portal
```

Delete the unused casing:
```bash
npx wrangler secret delete ERPNEXT_API_KEY --name cleaning-service-backend
npx wrangler secret delete ERPNEXT_API_SECRET --name cleaning-service-backend
npx wrangler secret delete ERPNEXT_API_KEY --name scratchsolidsolutions
npx wrangler secret delete ERPNEXT_API_SECRET --name scratchsolidsolutions
npx wrangler secret delete ERPNEXT_API_KEY --name scratchsolid-portal
npx wrangler secret delete ERPNEXT_API_SECRET --name scratchsolid-portal
```

Verify `ERPNext_API_KEY` exists in all three projects.

### 2.3 Secret Rotation Policy

Implement quarterly rotation:
1. Generate new secrets: `openssl rand -hex 32`
2. Set new secrets via Wrangler
3. Deploy all workers
4. Verify functionality
5. Delete old secrets after 24-hour grace period

---

## Phase 3: Cloudflare Configuration (High)

### 3.1 Enable Auto Minify

Dashboard → Speed → Optimization → Auto Minify:
- ✅ JavaScript
- ✅ CSS
- ✅ HTML

### 3.2 Enable Brotli Compression

Dashboard → Speed → Optimization → Brotli: ON

### 3.3 Configure SSL/TLS

Dashboard → SSL/TLS → Overview:
- Mode: **Full (strict)**
- Always Use HTTPS: ON
- Automatic HTTPS Rewrites: ON
- Enable TLS 1.3: ON
- Minimum TLS Version: 1.2

### 3.4 Configure WAF Rules

Dashboard → Security → WAF → Custom Rules:

Create these rules:
1. **Block Non-Cloudflare IPs to Admin**
   - Expression: `(http.host eq "portal.scratchsolidsolutions.org" and http.request.uri.path contains "/api/admin" and not ip.src in {Cloudflare IPs})`
   - Action: Block

2. **Rate Limit Public Auth Endpoints**
   - Expression: `(http.request.uri.path contains "/api/auth/login" or http.request.uri.path contains "/api/auth/signup")`
   - Action: Challenge (CAPTCHA) after 5 requests in 60s

3. **Block Known Bad Bots**
   - Expression: `(http.user_agent contains "sqlmap" or http.user_agent contains "nikto" or http.user_agent contains "nmap")`
   - Action: Block

### 3.5 Configure DDoS Protection

Dashboard → Security → DDoS:
- HTTP DDoS Attack Protection: ON (High sensitivity)
- Deploy managed ruleset

### 3.6 Enable Bot Fight Mode

Dashboard → Security → Bots:
- Bot Fight Mode: ON (for marketing site)
- Super Bot Fight Mode: ON (for portal — requires Pro plan)

---

## Phase 4: Server Hardening (Critical)

### 4.1 SSH Hardening

Edit `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60
AllowUsers your-username
X11Forwarding no
```

Restart: `sudo systemctl restart sshd`

### 4.2 fail2ban Configuration

Already installed by setup.sh. Verify config:
```bash
sudo systemctl status fail2ban
sudo fail2ban-client status sshd
```

Add custom jail for Traefik:
```ini
# /etc/fail2ban/jail.local
[traefik-auth]
enabled = true
port = http,https
filter = traefik-auth
logpath = /var/log/traefik/access.log
maxretry = 5
bantime = 3600
```

### 4.3 Automatic Security Updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
# Select YES
```

### 4.4 Disable Unnecessary Services

```bash
# Check open ports
sudo ss -tlnp

# Disable if not needed
sudo systemctl disable --now apache2 2>/dev/null || true
sudo systemctl disable --now nginx 2>/dev/null || true
```

### 4.5 Docker Security

```bash
# Run Docker Bench for Security
docker run --rm -it --net host --pid host --userns host \
  --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /etc:/etc:ro \
  -v /lib/systemd/system:/lib/systemd/system:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --label docker_bench_security \
  docker/docker-bench-security
```

Add `security_opt` to critical containers in docker-compose.yml:
```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
cap_add:
  - CHOWN
  - SETGID
  - SETUID
```

---

## Phase 5: Database Security (High)

### 5.1 D1 Database Backup Automation

Create a Cloudflare Workers Cron job for D1 backup:
- Export D1 tables to R2 bucket `scratchsolid-backups`
- Run daily at 03:00 UTC
- Retain 30 days

Script provided in: `infra/scripts/d1-backup-worker.js`

### 5.2 MariaDB (ERPNext) Security

```sql
-- On erpnext-db container
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
```

### 5.3 Postgres (Cal.com, n8n) Security

Enable SSL connections:
```bash
# In docker-compose, add to postgres services:
command: postgres -c ssl=on -c ssl_cert_file=/etc/ssl/certs/server.crt -c ssl_key_file=/etc/ssl/private/server.key
```

---

## Phase 6: Application Security Hardening (High)

### 6.1 CSRF Hardening
Remove hardcoded fallback. See code fix in `src/lib/csrf.ts`.

### 6.2 Rate Limiting Universal
Replace in-memory Map with KV-backed rate limiting on all public routes.

### 6.3 PII Field-Level Encryption
Encrypt `phone`, `address`, `tax_number`, `emergency_contact` fields at application layer.

### 6.4 Admin MFA Enforcement
Require 2FA for all users with role `admin` or `supervisor`.

### 6.5 Refresh Token Rotation
Implement rotation on every token refresh to prevent replay attacks.

---

## Phase 7: Monitoring & Alerting (Medium)

### 7.1 External Error Tracking
Integrate Sentry for all three projects:
```bash
npm install @sentry/nextjs
```

### 7.2 Uptime Monitoring
Configure Uptime Kuma (already deployed at `status.scratchsolidsolutions.org`):
- Portal: `https://portal.scratchsolidsolutions.org/api/health`
- Marketing: `https://scratchsolidsolutions.org`
- API: `https://api.scratchsolidsolutions.org`
- Booking: `https://booking.scratchsolidsolutions.org`
- n8n: `https://n8n.scratchsolidsolutions.org/healthz`
- ERP: `https://erp.scratchsolidsolutions.org`

### 7.3 Log Aggregation
Configure Cloudflare Logpush to R2 or external SIEM.

---

## Phase 8: Compliance (Medium)

### 8.1 POPIA
- Add explicit privacy notice to employee signup
- Implement data processing register
- Document third-party DPA (Meta, Zoho, n8n, Cloudflare)

### 8.2 GDPR
- Add cookie consent banner to marketing site
- Implement tracker consent management
- Document data processing register

---

## Execution Checklist

- [ ] Phase 1.1: Enable Cloudflare proxy on 4 DNS records
- [ ] Phase 1.2: Lock down UFW to Cloudflare IPs only
- [ ] Phase 2.1: Set all Wrangler secrets for all 3 projects
- [ ] Phase 2.2: Remove duplicate ERPNext secrets
- [ ] Phase 2.3: Document secret rotation calendar
- [ ] Phase 3.1: Enable Auto Minify
- [ ] Phase 3.2: Enable Brotli
- [ ] Phase 3.3: Configure SSL/TLS Full (strict)
- [ ] Phase 3.4: Configure WAF custom rules
- [ ] Phase 3.5: Enable DDoS protection
- [ ] Phase 3.6: Enable Bot Fight Mode
- [ ] Phase 4.1: SSH hardening
- [ ] Phase 4.2: fail2ban custom rules
- [ ] Phase 4.3: Automatic security updates
- [ ] Phase 4.4: Disable unnecessary services
- [ ] Phase 4.5: Docker security benchmark
- [ ] Phase 5.1: D1 backup cron job
- [ ] Phase 5.2: MariaDB hardening
- [ ] Phase 5.3: Postgres SSL
- [ ] Phase 6.1: CSRF hardening (code)
- [ ] Phase 6.2: KV rate limiting (code)
- [ ] Phase 6.3: PII encryption (code)
- [ ] Phase 6.4: Admin MFA enforcement (code)
- [ ] Phase 6.5: Refresh token rotation (code)
- [ ] Phase 7.1: Sentry integration
- [ ] Phase 7.2: Uptime Kuma monitors
- [ ] Phase 7.3: Logpush configuration
- [ ] Phase 8.1: POPIA privacy notice
- [ ] Phase 8.2: GDPR cookie consent

---

*Next: Start implementing code-level fixes and creating automation scripts.*
