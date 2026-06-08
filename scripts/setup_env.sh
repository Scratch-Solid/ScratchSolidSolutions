#!/bin/bash
set -euo pipefail

cd /opt/ScratchSolidSolutions/infra

# Generate random secrets
DB_PASS=$(openssl rand -hex 32)
N8N_ENC=$(openssl rand -hex 32)
NEXTAUTH=$(openssl rand -hex 32)
CAL_ENC=$(openssl rand -hex 32)
WEBHOOK=$(openssl rand -hex 32)

# Copy example
cp .env.example .env

# Replace placeholders with generated values
sed -i "s|<generate-32-char-hex>|${DB_PASS}|g" .env
sed -i "s|<your-resend-api-key>|placeholder-resend-key|g" .env
sed -i "s|<your-r2-access-key>|placeholder-r2-key|g" .env
sed -i "s|<your-r2-secret-key>|placeholder-r2-secret|g" .env

# Set specific values
sed -i "s|CALCOM_ENCRYPTION_KEY=.*|CALCOM_ENCRYPTION_KEY=${CAL_ENC}|g" .env
sed -i "s|N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=${N8N_ENC}|g" .env
sed -i "s|CALCOM_NEXTAUTH_SECRET=.*|CALCOM_NEXTAUTH_SECRET=${NEXTAUTH}|g" .env
sed -i "s|INTERNAL_PORTAL_N8N_WEBHOOK_SECRET=.*|INTERNAL_PORTAL_N8N_WEBHOOK_SECRET=${WEBHOOK}|g" .env

echo "ENV_FILE_CREATED"
