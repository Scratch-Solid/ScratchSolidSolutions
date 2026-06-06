#!/usr/bin/env bash
# Enable Cloudflare auto minification for JS, CSS, and HTML
# Requirements: CF_API_TOKEN with Zone:Edit permissions
# Usage: CF_API_TOKEN=xxx CF_ZONE_ID=xxx ./scripts/enable-cloudflare-minification.sh

set -euo pipefail

CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_ZONE_ID="${CF_ZONE_ID:-}"

if [[ -z "$CF_API_TOKEN" || -z "$CF_ZONE_ID" ]]; then
  echo "Error: Set CF_API_TOKEN and CF_ZONE_ID environment variables."
  exit 1
fi

echo "[Minify] Enabling auto minify (JS, CSS, HTML)..."

RESPONSE=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/minify" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"value":{"css":"on","html":"on","js":"on"}}')

if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
  echo "  ✅ Auto minify enabled for JS, CSS, and HTML"
else
  echo "  ❌ Failed: $(echo "$RESPONSE" | jq -r '.errors[0].message')"
  exit 1
fi

echo "[Minify] Done."
