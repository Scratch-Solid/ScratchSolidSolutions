#!/usr/bin/env bash
# List orphaned KV namespaces and R2 buckets for manual review and cleanup
# Requirements: CF_API_TOKEN with Account:Read and R2:Read permissions
# Usage: CF_API_TOKEN=xxx CF_ACCOUNT_ID=xxx ./scripts/cleanup-orphaned-resources.sh

set -euo pipefail

CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-}"

if [[ -z "$CF_API_TOKEN" || -z "$CF_ACCOUNT_ID" ]]; then
  echo "Error: Set CF_API_TOKEN and CF_ACCOUNT_ID environment variables."
  exit 1
fi

echo "=== Orphaned KV Namespace Scanner ==="
echo "Active KV IDs from wrangler.jsonc:"
grep -oP '"id": "\K[^"]+' internal-portal/wrangler.jsonc marketing-site/wrangler.jsonc backend-worker/wrangler.toml 2>/dev/null | sort -u > /tmp/active-kv-ids.txt
cat /tmp/active-kv-ids.txt

echo ""
echo "All KV namespaces in account:"
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result[] | "\(.id) \(.title)"' | sort > /tmp/all-kv.txt

echo ""
echo "Potentially orphaned KV namespaces (not in active configs):"
while read -r id title; do
  if ! grep -q "$id" /tmp/active-kv-ids.txt; then
    echo "  ⚠️  ${id} - ${title}"
  fi
done < /tmp/all-kv.txt

echo ""
echo "=== Orphaned R2 Bucket Scanner ==="
echo "Active R2 buckets from wrangler configs:"
grep -oP '"bucket_name": "\K[^"]+' internal-portal/wrangler.jsonc marketing-site/wrangler.jsonc 2>/dev/null | sort -u > /tmp/active-r2-buckets.txt
cat /tmp/active-r2-buckets.txt

echo ""
echo "All R2 buckets in account:"
curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result.buckets[] | .name' | sort > /tmp/all-r2.txt

echo ""
echo "Potentially orphaned R2 buckets (not in active configs):"
while read -r name; do
  if ! grep -q "$name" /tmp/active-r2-buckets.txt; then
    echo "  ⚠️  ${name}"
  fi
done < /tmp/all-r2.txt

echo ""
echo "Done. Review the list above before deleting anything."
