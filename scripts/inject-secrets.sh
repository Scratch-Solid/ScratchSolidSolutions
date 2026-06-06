#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# ScratchSolid 2.0 — Wrangler Secret Injection Script
# Injects all production secrets into all 3 Cloudflare Workers
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ScratchSolid 2.0 — Secret Injection                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# ─── Configuration ───
# IMPORTANT: Replace these placeholder values with actual secrets before running.
# DO NOT commit this file with real secrets.

RESEND_API_KEY="${RESEND_API_KEY:-}"                  # Set via environment or prompt
ZOHO_CLIENT_SECRET="${ZOHO_CLIENT_SECRET:-}"
ZOHO_ORG_ID="${ZOHO_ORG_ID:-}"
ZOHO_REFRESH_TOKEN="${ZOHO_REFRESH_TOKEN:-}"
META_ACCESS_TOKEN="${META_ACCESS_TOKEN:-}"
META_PHONE_NUMBER_ID="${META_PHONE_NUMBER_ID:-}"
META_VERIFY_TOKEN="${META_VERIFY_TOKEN:-}"
INTERNAL_PORTAL_N8N_WEBHOOK_SECRET="${INTERNAL_PORTAL_N8N_WEBHOOK_SECRET:-}"

# Pre-shared secrets (already generated)
JWT_SECRET="ca2339654822ea96b5284d2515bddb3ea9f2a8731e93560b3091e18706fb2389a66cff5b67f7f4262248b2da6f87e37448d274827a2f3ec930180a505e7b7f1b"
CSRF_SECRET="63b9252f0c70c130332b6f71a1cbe9fabd5702d8334c380237d48cd745ef2b05ff116e86545cfbff09114117e42ed552c5362c0a2aebecf5cc0fbe8185e5565a"

# ─── Prompt for missing secrets ───
if [[ -z "$RESEND_API_KEY" ]]; then
  read -rp "Enter RESEND_API_KEY: " RESEND_API_KEY
fi
if [[ -z "$ZOHO_CLIENT_SECRET" ]]; then
  read -rp "Enter ZOHO_CLIENT_SECRET: " ZOHO_CLIENT_SECRET
fi
if [[ -z "$ZOHO_ORG_ID" ]]; then
  read -rp "Enter ZOHO_ORG_ID: " ZOHO_ORG_ID
fi
if [[ -z "$ZOHO_REFRESH_TOKEN" ]]; then
  read -rp "Enter ZOHO_REFRESH_TOKEN: " ZOHO_REFRESH_TOKEN
fi
if [[ -z "$META_ACCESS_TOKEN" ]]; then
  read -rp "Enter META_ACCESS_TOKEN (optional): " META_ACCESS_TOKEN
fi
if [[ -z "$META_PHONE_NUMBER_ID" ]]; then
  read -rp "Enter META_PHONE_NUMBER_ID (optional): " META_PHONE_NUMBER_ID
fi
if [[ -z "$META_VERIFY_TOKEN" ]]; then
  read -rp "Enter META_VERIFY_TOKEN (optional): " META_VERIFY_TOKEN
fi
if [[ -z "$INTERNAL_PORTAL_N8N_WEBHOOK_SECRET" ]]; then
  read -rp "Enter INTERNAL_PORTAL_N8N_WEBHOOK_SECRET: " INTERNAL_PORTAL_N8N_WEBHOOK_SECRET
fi

# ─── Helper ───
put_secret() {
  local name=$1
  local project=$2
  local value=$3
  
  if [[ -z "$value" ]]; then
    echo "   ⚠️  Skipping $name for $project (empty value)"
    return 0
  fi
  
  echo "   → Setting $name for $project..."
  echo "$value" | npx wrangler secret put "$name" --name "$project" --y 2>/dev/null || \
    echo "      ⚠️  Failed to set $name (may already exist or auth issue)"
}

# ─── Project 1: cleaning-service-backend ───
echo ""
echo "[1/3] Injecting secrets into cleaning-service-backend..."
cd "$(dirname "$0")/../backend-worker" || exit 1

put_secret "JWT_SECRET" "cleaning-service-backend" "$JWT_SECRET"
put_secret "CSRF_SECRET" "cleaning-service-backend" "$CSRF_SECRET"
put_secret "RESEND_API_KEY" "cleaning-service-backend" "$RESEND_API_KEY"
put_secret "ZOHO_CLIENT_SECRET" "cleaning-service-backend" "$ZOHO_CLIENT_SECRET"
put_secret "ZOHO_ORG_ID" "cleaning-service-backend" "$ZOHO_ORG_ID"
put_secret "ZOHO_REFRESH_TOKEN" "cleaning-service-backend" "$ZOHO_REFRESH_TOKEN"
put_secret "INTERNAL_PORTAL_N8N_WEBHOOK_SECRET" "cleaning-service-backend" "$INTERNAL_PORTAL_N8N_WEBHOOK_SECRET"

# ─── Project 2: scratchsolidsolutions (marketing) ───
echo ""
echo "[2/3] Injecting secrets into scratchsolidsolutions..."
cd "$(dirname "$0")/../marketing-site" || exit 1

put_secret "JWT_SECRET" "scratchsolidsolutions" "$JWT_SECRET"
put_secret "CSRF_SECRET" "scratchsolidsolutions" "$CSRF_SECRET"
put_secret "RESEND_API_KEY" "scratchsolidsolutions" "$RESEND_API_KEY"
put_secret "ZOHO_CLIENT_SECRET" "scratchsolidsolutions" "$ZOHO_CLIENT_SECRET"
put_secret "ZOHO_ORG_ID" "scratchsolidsolutions" "$ZOHO_ORG_ID"
put_secret "ZOHO_REFRESH_TOKEN" "scratchsolidsolutions" "$ZOHO_REFRESH_TOKEN"

# ─── Project 3: scratchsolid-portal ───
echo ""
echo "[3/3] Injecting secrets into scratchsolid-portal..."
cd "$(dirname "$0")/../internal-portal" || exit 1

put_secret "JWT_SECRET" "scratchsolid-portal" "$JWT_SECRET"
put_secret "CSRF_SECRET" "scratchsolid-portal" "$CSRF_SECRET"
put_secret "RESEND_API_KEY" "scratchsolid-portal" "$RESEND_API_KEY"
put_secret "ZOHO_CLIENT_SECRET" "scratchsolid-portal" "$ZOHO_CLIENT_SECRET"
put_secret "ZOHO_ORG_ID" "scratchsolid-portal" "$ZOHO_ORG_ID"
put_secret "ZOHO_REFRESH_TOKEN" "scratchsolid-portal" "$ZOHO_REFRESH_TOKEN"
put_secret "META_ACCESS_TOKEN" "scratchsolid-portal" "$META_ACCESS_TOKEN"
put_secret "META_PHONE_NUMBER_ID" "scratchsolid-portal" "$META_PHONE_NUMBER_ID"
put_secret "META_VERIFY_TOKEN" "scratchsolid-portal" "$META_VERIFY_TOKEN"
put_secret "INTERNAL_PORTAL_N8N_WEBHOOK_SECRET" "scratchsolid-portal" "$INTERNAL_PORTAL_N8N_WEBHOOK_SECRET"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ✅ Secret Injection Complete                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Verify secrets: npx wrangler secret list --name <project>"
echo "  2. Deploy each worker: npx wrangler deploy"
echo "  3. Test API endpoints"
