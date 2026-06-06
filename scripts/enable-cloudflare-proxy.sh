#!/usr/bin/env bash
# Enable Cloudflare proxy on 4 unproxied DNS records
# Requirements: CF_API_TOKEN with Zone:Edit and DNS:Edit permissions
# Usage: CF_API_TOKEN=xxx CF_ZONE_ID=xxx ./scripts/enable-cloudflare-proxy.sh

set -euo pipefail

CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_ZONE_ID="${CF_ZONE_ID:-}"

if [[ -z "$CF_API_TOKEN" || -z "$CF_ZONE_ID" ]]; then
  echo "Error: Set CF_API_TOKEN and CF_ZONE_ID environment variables."
  echo "Zone ID can be found in the Cloudflare dashboard overview."
  exit 1
fi

DOMAINS=(
  "booking.scratchsolidsolutions.org"
  "erp.scratchsolidsolutions.org"
  "n8n.scratchsolidsolutions.org"
  "status.scratchsolidsolutions.org"
)

for domain in "${DOMAINS[@]}"; do
  echo "[Proxy] Enabling proxy for ${domain}..."

  # Get record ID
  RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${domain}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" | jq -r '.result[0].id')

  if [[ "$RECORD_ID" == "null" || -z "$RECORD_ID" ]]; then
    echo "  ⚠️  Record not found for ${domain}"
    continue
  fi

  # Update record to proxied
  RESPONSE=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${RECORD_ID}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"proxied":true}')

  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo "  ✅ Proxy enabled for ${domain}"
  else
    echo "  ❌ Failed: $(echo "$RESPONSE" | jq -r '.errors[0].message')"
  fi
done

echo "[Proxy] Done. Verify in Cloudflare dashboard > DNS > Records."
