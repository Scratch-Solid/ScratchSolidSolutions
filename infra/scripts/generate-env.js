#!/usr/bin/env node
/**
 * Generate a complete .env file for the ScratchSolid Docker Compose stack.
 * Run on the Hetzner server (or locally, then scp the output to the server).
 *
 * Usage:
 *   node generate-env.js > .env
 *
 * Then fill in the REQUIRED MANUAL fields marked with [REQUIRED MANUAL].
 */

const crypto = require('crypto');

function genHex(n = 32) {
  return crypto.randomBytes(n).toString('hex');
}

const env = `# ═══════════════════════════════════════════════════════════════════
# ScratchSolid 2.0 — Unified Infrastructure Environment
# GENERATED: ${new Date().toISOString()}
# Copy this file to infra/.env and fill in all [REQUIRED MANUAL] fields.
# ═══════════════════════════════════════════════════════════════════

# ─── TRAEFIK / LET'S ENCRYPT ───
ACME_EMAIL=admin@scratchsolidsolutions.org

# ─── CAL.COM (Self-Hosted, AGPL v3, Zero License Cost) ───
CALCOM_DB_USER=scratch_admin
CALCOM_DB_PASSWORD=${genHex()}
CALCOM_DB_NAME=calcom
CALCOM_WEBAPP_URL=https://booking.scratchsolidsolutions.org
CALCOM_NEXTAUTH_SECRET=${genHex()}
CALCOM_ENCRYPTION_KEY=${genHex()}

# Email provider for Cal.com notifications (Resend — free tier: 3000 emails/day)
# [REQUIRED MANUAL] Get from https://resend.com
EMAIL_FROM=noreply@scratchsolidsolutions.org
EMAIL_SERVER_HOST=smtp.resend.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=resend
EMAIL_SERVER_PASSWORD=YOUR_RESEND_API_KEY_HERE

# ─── N8N (Apache 2.0, Zero License Cost) ───
N8N_DB_USER=n8n
N8N_DB_PASSWORD=${genHex()}
N8N_DB_NAME=n8n
N8N_ENCRYPTION_KEY=${genHex()}
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=scratchadmin
N8N_BASIC_AUTH_PASSWORD=${genHex()}
N8N_WEBHOOK_URL=https://n8n.scratchsolidsolutions.org/
N8N_IP_WHITELIST=0.0.0.0/0

# ─── ERPNEXT (GNU GPL v3, Zero License Cost) ───
ERPNEXT_SITE_NAME=scratchsolid.local
ERPNEXT_DB_ROOT_PASSWORD=${genHex()}
ERPNEXT_DB_NAME=_17d34f6a7c2d8a9

# ─── SHARED ───
TZ=Africa/Johannesburg

# ─── RESEND EMAIL API (Free tier: 3000 emails/day)
# [REQUIRED MANUAL] Get from https://resend.com
RESEND_API_KEY=YOUR_RESEND_API_KEY_HERE

# ─── INTERNAL PORTAL WEBHOOK SECRET (n8n ↔ Portal HMAC) ───
INTERNAL_PORTAL_N8N_WEBHOOK_SECRET=${genHex()}

# ─── R2 BACKUP CONFIGURATION (Cloudflare R2 — 10GB free) ───
# [REQUIRED MANUAL] Create in Cloudflare Dashboard → R2
R2_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_HERE
R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET_KEY_HERE
R2_BUCKET_NAME=scratchsolid-backups
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
BACKUP_RETENTION_DAYS=30

# ─── MARKETING SITE (Next.js on Hetzner) ───
MARKETING_DB_USER=marketing
MARKETING_DB_PASSWORD=${genHex()}
MARKETING_DB_NAME=marketing
MARKETING_BASE_URL=https://scratchsolidsolutions.org
MARKETING_API_URL=https://api.scratchsolidsolutions.org/api
MARKETING_UPLOADS_BUCKET=scratchsolid-uploads
R2_PUBLIC_BASE=https://uploads.scratchsolidsolutions.org
S3_REGION=auto
S3_FORCE_PATH_STYLE=false

# App secrets (must match values currently set as Cloudflare secrets)
JWT_SECRET=${genHex()}
CSRF_SECRET=${genHex()}

# ─── ZOHO BOOKS/CRM ───
# [REQUIRED MANUAL] OAuth credentials from https://api-console.zoho.com
ZOHO_ORG_ID=
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=

# ─── INTERNAL PORTAL (Next.js on Hetzner) ───
PORTAL_DB_USER=portal
PORTAL_DB_PASSWORD=${genHex()}
PORTAL_DB_NAME=portal
PORTAL_BASE_URL=https://portal.scratchsolidsolutions.org
PORTAL_UPLOADS_BUCKET=scratchsolid-uploads
PORTAL_PHOTOS_BUCKET=scratchsolid-uploads

# ─── ERPNext API (cleaner shift assignments / payroll) ───
# Populated AFTER first ERPNext login (see README)
ERPNEXT_BASE_URL=
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=

# ─── META WHATSAPP CLOUD API (Phase 5) ───
# [REQUIRED MANUAL] Create at https://developers.facebook.com
META_WABA_ID=
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
META_VERIFY_TOKEN=

# ─── DOCUSIGN (Developer Account — free sandbox) ───
# [REQUIRED MANUAL] Created via DocuSign Developer account
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_SECRET_KEY=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_PRIVATE_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi
DOCUSIGN_CONNECT_SECRET=
`;

console.log(env);
