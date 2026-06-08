#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

# Generate all secrets
DB_PASS=$(openssl rand -hex 32)
N8N_ENC=$(openssl rand -hex 32)
NEXTAUTH=$(openssl rand -hex 32)
CAL_ENC=$(openssl rand -hex 32)
WEBHOOK=$(openssl rand -hex 32)
ADMIN_PASS=$(openssl rand -hex 16)

# Write .env
cat > .env <<EOF
# Traefik
ACME_EMAIL=admin@scratchsolidsolutions.org

# Cal.com
CALCOM_DB_USER=scratch_admin
CALCOM_DB_PASSWORD=${DB_PASS}
CALCOM_DB_NAME=calcom
CALCOM_WEBAPP_URL=https://booking.scratchsolidsolutions.org
CALCOM_NEXTAUTH_SECRET=${NEXTAUTH}
CALCOM_ENCRYPTION_KEY=${CAL_ENC}
EMAIL_FROM=noreply@scratchsolidsolutions.org
EMAIL_SERVER_HOST=smtp.resend.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=resend
EMAIL_SERVER_PASSWORD=placeholder-resend-key

# n8n
N8N_DB_USER=n8n
N8N_DB_PASSWORD=${DB_PASS}
N8N_DB_NAME=n8n
N8N_ENCRYPTION_KEY=${N8N_ENC}
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=scratchadmin
N8N_BASIC_AUTH_PASSWORD=${ADMIN_PASS}
N8N_WEBHOOK_URL=https://n8n.scratchsolidsolutions.org/
N8N_IP_WHITELIST=0.0.0.0/0

# ERPNext
ERPNEXT_SITE_NAME=scratchsolid.local
ERPNEXT_DB_ROOT_PASSWORD=${DB_PASS}
ERPNEXT_DB_NAME=_17d34f6a7c2d8a9

# Shared
TZ=Africa/Johannesburg
RESEND_API_KEY=placeholder-resend-key

# Portal webhook
INTERNAL_PORTAL_N8N_WEBHOOK_SECRET=${WEBHOOK}

# R2 backups
R2_ACCESS_KEY_ID=placeholder-r2-key
R2_SECRET_ACCESS_KEY=placeholder-r2-secret
R2_BUCKET_NAME=scratchsolid-backups
R2_ENDPOINT=https://account-id.r2.cloudflarestorage.com
BACKUP_RETENTION_DAYS=30
EOF

echo "ENV_CREATED"
echo "Admin Password: ${ADMIN_PASS}"
echo "Webhook Secret: ${WEBHOOK}"
