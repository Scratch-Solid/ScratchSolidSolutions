# ERPNext Self-Hosted Deployment

## Overview
This directory contains a Docker Compose-based ERPNext deployment for Scratch Solid Solutions.

## Prerequisites
- Docker Engine >= 24.0
- Docker Compose >= 2.20
- 4GB+ RAM available for containers

## Quick Start

1. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and set strong passwords
   ```

2. **Run the setup script:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Access ERPNext:**
   - URL: http://localhost:8080
   - Default Site: `scratchsolid.local`
   - Login: `Administrator` / password from `.env`

## Architecture
- **backend**: Frappe + ERPNext Python application
- **frontend**: Nginx reverse proxy serving static assets
- **websocket**: Frappe Socket.IO for real-time updates
- **queue-default/short/long**: Background job workers
- **scheduler**: Cron-like job scheduler
- **db**: MariaDB 10.6
- **redis-cache/queue/socketio**: Redis instances for caching, queues, and real-time

## Integration with Internal Portal
After setup, generate an API key in ERPNext:
1. Login as Administrator
2. Navigate to User > Administrator > API Access
3. Generate API Key and API Secret
4. Set these in the internal portal environment:
   - `ERPNEXT_BASE_URL=http://localhost:8080`
   - `ERPNEXT_API_KEY=<key>`
   - `ERPNEXT_API_SECRET=<secret>`

## Maintenance
```bash
# View logs
docker compose logs -f backend

# Backup site
docker compose exec backend bench --site scratchsolid.local backup

# Update to latest v15 patch
docker compose pull
docker compose up -d

# Shell into backend
docker compose exec backend bash
```
