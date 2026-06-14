# Zero-Licensing Account Setup — Status & Deployment Guide

## Executive Summary

All four zero-licensing services (ERPNext, Cal.com, n8n, PostgreSQL) are **fully configured in code but NOT yet deployed** on the Hetzner server. No `.env` file exists, and no Docker containers are running.

This document provides:
1. A per-service status assessment
2. Generated secrets (via `scripts/generate-env.js`)
3. Exact deployment commands for the Hetzner server
4. Post-deployment first-time setup instructions

---

## Per-Service Status

### 1. ERPNext Free Version
**License:** GNU GPL v3 (zero cost)  
**Status:** ⚠️ **NOT DEPLOYED**

- `infra/docker-compose.yml` defines all ERPNext services (backend, frontend, websocket, queue, scheduler, MariaDB, Redis ×3)
- `internal-portal/infra/erpnext/docker-compose.yml` is a standalone alternative
- `internal-portal/infra/erpnext/README.md` has setup instructions
- No `.env` file exists → Docker Compose cannot start
- No first-time site creation has been run
- Portal integration variables (`ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`) are empty in portal env config

**What needs to happen:**
1. Deploy the Docker Compose stack
2. Run ERPNext first-time site creation (`bench new-site`)
3. Log in as Administrator and generate an API key
4. Update the portal `.env` with the API key

---

### 2. Cal.com Self-Hosted
**License:** AGPL v3 (zero cost)  
**Status:** ⚠️ **NOT DEPLOYED**

- `infra/docker-compose.yml` defines `calcom-postgres` + `calcom_engine`
- `.env.example` has placeholder values for `CALCOM_*` secrets
- n8n workflow JSON exists at `infra/n8n-workflows/calcom-booking-ingestion.json`
- Portal webhook handler exists at `internal-portal/src/app/api/webhooks/n8n/booking-ingested/route.ts`
- Marketing site `/book` page still uses a custom form (no Cal.com integration yet)

**What needs to happen:**
1. Deploy the Docker Compose stack
2. Visit `https://booking.scratchsolidsolutions.org/setup` and create admin account
3. Configure event types (studio clean, 1-bedroom, 2-bedroom, etc.)
4. Set up Cal.com API credentials in n8n
5. Import the n8n workflow
6. Marketing site Phase 4: decide redirect vs embed vs dual path

---

### 3. n8n Orchestration
**License:** Apache 2.0 (zero cost)  
**Status:** ⚠️ **NOT DEPLOYED**

- `infra/docker-compose.yml` defines `n8n-postgres` + `n8n_orchestrator`
- `.env.example` has placeholder values for `N8N_*` secrets
- Workflow JSON files exist in `infra/n8n-workflows/`:
  - `calcom-booking-ingestion.json`
  - `create-shift.json`
  - `send-whatsapp.json`
  - `zoho-create-invoice.json`
  - `zoho-payment-webhook.json`
- Portal webhook routes exist at `/api/webhooks/n8n/*`

**What needs to happen:**
1. Deploy the Docker Compose stack
2. Visit `https://n8n.scratchsolidsolutions.org` and create owner account
3. Import all workflows from `infra/n8n-workflows/`
4. Configure Cal.com API credentials
5. Configure Portal webhook secret as HTTP Header Auth credential
6. Activate workflows

---

### 4. PostgreSQL Databases
**License:** PostgreSQL License (zero cost)  
**Status:** ⚠️ **NOT DEPLOYED**

Four PostgreSQL instances are defined in `docker-compose.yml`:
1. `calcom-postgres` — Cal.com data
2. `n8n-postgres` — n8n workflow data
3. `marketing-postgres` — Marketing site user data
4. `portal-postgres` — Internal portal data

- All use `postgres:15-alpine` image
- Marketing site code already uses PostgreSQL adapter (`pg-d1.ts`)
- Migration runbook exists (`MARKETING_HETZNER_MIGRATION.md`)
- D1 → PostgreSQL converter script exists (`scripts/d1-to-postgres.mjs`)

**What needs to happen:**
1. Deploy the Docker Compose stack
2. For marketing site: export D1 data, convert, and load into `marketing-postgres`
3. For portal: apply schema migrations to `portal-postgres`
4. For Cal.com/n8n: databases are auto-initialized by their apps

---

## Deployment Checklist

### Pre-Requirements
- [ ] Hetzner server with Ubuntu 22.04 LTS, 4vCPU, 8GB RAM, 100GB disk
- [ ] SSH access as root
- [ ] DNS A records pointing to server IP:
  - `booking.scratchsolidsolutions.org`
  - `n8n.scratchsolidsolutions.org`
  - `erp.scratchsolidsolutions.org`
  - `status.scratchsolidsolutions.org`
  - `scratchsolidsolutions.org`
  - `www.scratchsolidsolutions.org`
  - `portal.scratchsolidsolutions.org`
- [ ] Resend API key (free tier: 3000 emails/day)
- [ ] Cloudflare R2 credentials (free tier: 10GB)
- [ ] Zoho Books OAuth credentials (free trial)

### Deployment Steps

#### Step 1: Upload code to server

```bash
# On your local machine (or clone from GitHub on the server)
scp -r /path/to/ScratchSolidSolutions root@<SERVER_IP>:/opt/
```

#### Step 2: SSH into server and run deployment

```bash
ssh root@<SERVER_IP>
cd /opt/ScratchSolidSolutions/infra
chmod +x scripts/deploy-stack.sh
./scripts/deploy-stack.sh
```

This script will:
1. Generate all cryptographically secure secrets automatically
2. Install Docker + Docker Compose
3. Configure UFW firewall (ports 22, 80, 443)
4. Set up fail2ban + unattended upgrades
5. Pull all Docker images and start containers
6. Run ERPNext first-time site creation
7. Verify all services are healthy

#### Step 3: Fill in manual credentials

After the script generates `.env`, edit it:

```bash
nano /opt/ScratchSolidSolutions/infra/.env
```

Fill in these fields (marked `[REQUIRED MANUAL]`):

| Field | Where to get it |
|-------|-----------------|
| `RESEND_API_KEY` | https://resend.com → API Keys |
| `EMAIL_SERVER_PASSWORD` | Same as `RESEND_API_KEY` |
| `R2_ACCESS_KEY_ID` | Cloudflare Dashboard → R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | Same as above |
| `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `ZOHO_ORG_ID` | Zoho Books → Settings → Developer Space |
| `ZOHO_CLIENT_ID` | https://api-console.zoho.com |
| `ZOHO_CLIENT_SECRET` | Same as above |
| `ZOHO_REFRESH_TOKEN` | OAuth flow (see DEPLOYMENT.md) |

Then restart services:

```bash
cd /opt/ScratchSolidSolutions/infra
docker compose up -d
```

#### Step 4: First-time app setup

**ERPNext:**
```bash
# Visit https://erp.scratchsolidsolutions.org
# Login as: Administrator / <ERPNEXT_DB_ROOT_PASSWORD from .env>
# Create company: Scratch Solid Solutions
# Create employees (cleaners) with shift schedules
# Generate API key: User → Administrator → API Access → Generate Keys
# Update .env with ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET
```

**Cal.com:**
```bash
# Visit https://booking.scratchsolidsolutions.org/setup
# Create admin account
# Create event types matching the property types in the booking-ingested webhook
# Get Cal.com API key for n8n integration
```

**n8n:**
```bash
# Visit https://n8n.scratchsolidsolutions.org
# Create owner account
# Settings → Credentials → Add Cal.com API credential
# Settings → Credentials → Add HTTP Header Auth (use INTERNAL_PORTAL_N8N_WEBHOOK_SECRET from .env)
# Import workflows from infra/n8n-workflows/
# Activate workflows
```

#### Step 5: Marketing site database migration (if cutting over from D1)

```bash
# On a machine with wrangler access:
wrangler d1 export scratchsolid-marketing-db --remote --output d1-dump.sql

# On the Hetzner server:
cd /opt/ScratchSolidSolutions
node infra/scripts/d1-to-postgres.mjs d1-dump.sql > marketing-postgres.sql
docker compose cp marketing-postgres.sql marketing-postgres:/tmp/load.sql
docker compose exec marketing-postgres \
  psql -U marketing -d marketing -f /tmp/load.sql
```

#### Step 6: Portal database setup

```bash
# On the Hetzner server:
cd /opt/ScratchSolidSolutions/infra
docker compose exec portal-postgres psql -U portal -d portal -c "\dt"
# If tables are missing, apply migrations from internal-portal/migrations/
```

---

## Post-Deployment Verification

Run the health check script:

```bash
cd /opt/ScratchSolidSolutions/infra
chmod +x verify.sh
./verify.sh
```

Expected output: all 12 services should show ✅ healthy.

Test each endpoint:

```bash
# Cal.com
curl -I https://booking.scratchsolidsolutions.org

# n8n
curl -s https://n8n.scratchsolidsolutions.org/healthz

# ERPNext
curl -s https://erp.scratchsolidsolutions.org/api/method/ping

# Portal
curl -s https://portal.scratchsolidsolutions.org/api/health

# Marketing
curl -s https://scratchsolidsolutions.org/api/health
```

---

## Security Notes

- The `.env` file contains all secrets. **Never commit it to Git.**
- All database passwords are 64-character hex strings (256 bits of entropy).
- UFW firewall blocks all incoming traffic except SSH, HTTP, and HTTPS.
- fail2ban bans IPs after 5 failed SSH attempts.
- n8n basic auth protects the workflow editor.
- Cal.com requires admin setup before public booking URLs work.
- ERPNext admin password is the same as the MariaDB root password (change it after first login).

---

## Troubleshooting

### Service won't start
```bash
docker compose logs <service_name>
# Example: docker compose logs calcom_engine
```

### Database connection refused
```bash
docker compose ps
# Check if postgres container is healthy
docker compose logs calcom_db
```

### Traefik not issuing SSL certificates
```bash
# Ensure DNS A records are propagated
dig +short booking.scratchsolidsolutions.org
# Check Traefik logs
docker compose logs scratch_traefik
```

### ERPNext site not found
```bash
# Re-run site creation manually
docker exec erpnext_backend bench new-site scratchsolid.local \
  --mariadb-root-password <PASSWORD> \
  --admin-password <PASSWORD>
```

---

## Files Created/Modified in This Session

- `infra/scripts/generate-env.js` — Generates `.env` with secure secrets
- `infra/scripts/deploy-stack.sh` — One-command deployment script for Hetzner
- `infra/ZERO_LICENSE_SETUP_STATUS.md` — This document
