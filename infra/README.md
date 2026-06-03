# ScratchSolid 2.0 — Infrastructure

Unified Docker Compose stack for the ScratchSolid operational engine.

## What's Inside

| Service | Role | Domain |
|---------|------|--------|
| **Traefik** | Reverse proxy + automatic SSL | — |
| **Cal.com** | Client booking & scheduling | `booking.scratchsolidsolutions.org` |
| **n8n** | Workflow orchestration hub | `n8n.scratchsolidsolutions.org` |
| **ERPNext** | Workforce & payroll | `erp.scratchsolidsolutions.org` |
| **Uptime Kuma** | Monitoring & alerting | `status.scratchsolidsolutions.org` |
| **Backup** | Daily DB dumps to R2 | — (internal container) |

## Quick Start

```bash
# 1. SSH into your unmanaged Linux server (Ubuntu 22.04 LTS, 4vCPU/8GB/100GB)
ssh root@<server-ip>

# 2. Clone or upload this repository
cd /opt

git clone https://github.com/Scratch-Solid/ScratchSolidSolutions.git


# 3. Enter the infra directory
cd ScratchSolidSolutions/infra

# 4. Configure environment
# Edit ALL secrets before deploying
cp .env.example .env
nano .env

# 5. Bootstrap everything (Docker, firewall, SSL, services)
chmod +x setup.sh verify.sh
./setup.sh

# 6. Verify all services are healthy
./verify.sh

# 7. (Optional) Enable continuous monitoring
./verify.sh --watch
```

## Environment Variables

See `.env.example` for the full list. Critical secrets to generate:

```bash
# Generate strong secrets
openssl rand -hex 32
```

| Variable | Purpose |
|----------|---------|
| `CALCOM_DB_PASSWORD` | Cal.com Postgres password |
| `CALCOM_NEXTAUTH_SECRET` | Cal.com session encryption |
| `CALCOM_ENCRYPTION_KEY` | Cal.com data encryption |
| `N8N_DB_PASSWORD` | n8n Postgres password |
| `N8N_ENCRYPTION_KEY` | n8n workflow encryption |
| `N8N_BASIC_AUTH_PASSWORD` | n8n UI login password |
| `ERPNEXT_DB_ROOT_PASSWORD` | MariaDB root password |
| `RESEND_API_KEY` | Email delivery API key |
| `INTERNAL_PORTAL_N8N_WEBHOOK_SECRET` | HMAC signature for Portal ↔ n8n |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key (backups) |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key (backups) |
| `R2_BUCKET_NAME` | R2 bucket for database backups |
| `R2_ENDPOINT` | R2 S3-compatible endpoint URL |

## DNS Requirements

Point these A records to your server's public IP:

| Record | Target |
|--------|--------|
| `booking.scratchsolidsolutions.org` | `<server-ip>` |
| `n8n.scratchsolidsolutions.org` | `<server-ip>` |
| `erp.scratchsolidsolutions.org` | `<server-ip>` |
| `status.scratchsolidsolutions.org` | `<server-ip>` |

## Daily Operations

```bash
# View all running services
docker compose ps

# View logs for a specific service
docker compose logs -f n8n

# Restart a service
docker compose restart calcom-web

# Full stack restart
docker compose down && docker compose up -d

# Health check
./verify.sh --json

# Check disk usage
docker system df

# Prune unused images (run monthly)
docker image prune -f

# Test backup manually
docker exec scratch_backup /scripts/backup.sh

# View backup logs
docker compose logs -f backup

# Access Uptime Kuma dashboard
# Open https://status.scratchsolidsolutions.org
# Create monitors for:
#   - https://booking.scratchsolidsolutions.org
#   - https://n8n.scratchsolidsolutions.org
#   - https://erp.scratchsolidsolutions.org
#   - https://portal.scratchsolidsolutions.org
```

## Security

- **UFW firewall**: Only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) are exposed.
- **fail2ban**: Automatically bans IPs after 5 failed SSH attempts.
- **Unattended upgrades**: Security patches auto-install nightly.
- **n8n access**: Change `N8N_IP_WHITELIST` in `.env` to restrict UI access to your office IP.

## Troubleshooting

### Traefik not issuing certificates

Ensure DNS A records are propagated before starting Traefik:
```bash
dig +short booking.scratchsolidsolutions.org
```

### Cal.com database fails to start

Check Postgres health:
```bash
docker compose logs calcom-postgres
```

### Backups failing

Check R2 credentials and endpoint:
```bash
docker compose logs backup
docker exec scratch_backup /scripts/backup.sh
```

Ensure the R2 bucket exists and the access key has `Object Read & Write` permissions.

### ERPNext site not found

Run the original ERPNext setup script first:
```bash
cd erpnext && ./setup.sh
```

### n8n webhooks return 404

Ensure `WEBHOOK_URL` in `.env` matches the public n8n domain with a trailing slash.

## Scaling Path

When load exceeds single-server capacity:

1. **n8n queue mode**: Enable Redis + multiple worker instances.
2. **Database replication**: Move Postgres/MariaDB to dedicated DB server.
3. **Docker Swarm**: Convert `docker-compose.yml` to Docker Swarm stack for multi-node.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐  │
│  │ Booking  │  │ n8n Web  │  │ ERPNext Web             │  │
│  │ Site     │  │ UI       │  │ UI                      │  │
│  └────┬─────┘  └────┬─────┘  └───────────┬─────────────┘  │
│       │             │                    │                 │
│  booking.*    n8n.*                erp.*                 │
└───────┼─────────────┼────────────────────┼───────────────┘
        │             │                    │
        ▼             ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRAEFIK (SSL/Proxy)                         │
└───────┬─────────────┬────────────────────┬───────────────────┘
        │             │                    │
   ┌────▼────┐  ┌────▼────┐  ┌───────────▼────────────┐
   │ Cal.com │  │   n8n   │  │      ERPNext           │
   │  (web)  │  │ (core)  │  │  (backend + frontend)  │
   └────┬────┘  └────┬────┘  └───────────┬────────────┘
        │             │                    │
   ┌────▼────┐  ┌────▼────┐  ┌───────────▼────────────┐
   │ Postgres│  │ Postgres│  │  MariaDB + Redis × 3     │
   └─────────┘  └─────────┘  └──────────────────────────┘
```

## License

Internal — Scratch Solid Solutions.
