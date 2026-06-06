#!/usr/bin/env bash
# One-shot secret injection for all three ScratchSolid projects
# Usage: ./scripts/inject-all-secrets.sh
# Requires: npx wrangler and logged-in Cloudflare account

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.secrets"

# Auto-load .env.secrets if it exists
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
  echo "[Config] Loaded secrets from ${ENV_FILE}"
fi

inject_secret() {
  local project=$1
  local name=$2
  local value=$3

  if [[ -z "$value" ]]; then
    echo "  SKIP ${name} (not set)"
    return
  fi

  echo -n "  PUT ${name} => ${project}..."
  if echo "$value" | npx wrangler secret put "$name" --name "$project" > /dev/null 2>&1; then
    echo " OK"
  else
    echo " FAIL"
  fi
}

echo "=== ScratchSolid Secret Injection ==="
echo ""

echo "Project: cleaning-service-backend"
inject_secret "cleaning-service-backend" "ZOHO_ORG_ID"        "$SSS_ZOHO_ORG_ID"
inject_secret "cleaning-service-backend" "ZOHO_REFRESH_TOKEN" "$SSS_ZOHO_REFRESH_TOKEN"
inject_secret "cleaning-service-backend" "CSRF_SECRET"        "$SSS_CSRF_SECRET"
echo ""

echo "Project: scratchsolidsolutions"
inject_secret "scratchsolidsolutions" "JWT_SECRET"         "$SSS_JWT_SECRET"
inject_secret "scratchsolidsolutions" "CSRF_SECRET"        "$SSS_CSRF_SECRET"
inject_secret "scratchsolidsolutions" "RESEND_API_KEY"     "$SSS_RESEND_API_KEY"
inject_secret "scratchsolidsolutions" "ZOHO_CLIENT_SECRET" "$SSS_ZOHO_CLIENT_SECRET"
inject_secret "scratchsolidsolutions" "ZOHO_ORG_ID"        "$SSS_ZOHO_ORG_ID"
inject_secret "scratchsolidsolutions" "ZOHO_REFRESH_TOKEN" "$SSS_ZOHO_REFRESH_TOKEN"
echo ""

echo "Project: scratchsolid-portal"
inject_secret "scratchsolid-portal" "RESEND_API_KEY"     "$SSS_RESEND_API_KEY"
inject_secret "scratchsolid-portal" "ZOHO_CLIENT_SECRET" "$SSS_ZOHO_CLIENT_SECRET"
inject_secret "scratchsolid-portal" "ZOHO_ORG_ID"        "$SSS_ZOHO_ORG_ID"
inject_secret "scratchsolid-portal" "ZOHO_REFRESH_TOKEN" "$SSS_ZOHO_REFRESH_TOKEN"
echo ""

echo "=== Done ==="
echo "Verify with: npx wrangler secret list --name <project>"
