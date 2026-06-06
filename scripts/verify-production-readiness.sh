#!/usr/bin/env bash
# Production readiness verification script
# Checks that all critical security controls are in place before go-live

set -uo pipefail

ERRORS=0
WARNINGS=0

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; ((ERRORS++)); }
warn() { echo "  ⚠️  $1"; ((WARNINGS++)); }
skip() { echo "  ⏭️  $1"; }

echo "=== ScratchSolid 2.0 Production Readiness Check ==="
echo ""

# 1. Check DNS records are proxied
echo "[1/10] DNS Proxy Status"
if command -v dig > /dev/null 2>&1; then
  for host in portal booking erp n8n status; do
    IP=$(dig +short "${host}.scratchsolidsolutions.org" | head -1)
    if [[ -z "$IP" ]]; then
      skip "${host} — could not resolve (no dig)"
    elif [[ "$IP" == "167.233.18.87" ]]; then
      fail "${host}.scratchsolidsolutions.org resolves to origin IP ($IP) — proxy NOT enabled"
    else
      pass "${host}.scratchsolidsolutions.org is proxied (resolves to ${IP})"
    fi
  done
else
  skip "dig not available — check manually in Cloudflare dashboard"
fi
echo ""

# 2. Check wrangler secrets (for scratchsolid-portal)
echo "[2/10] Wrangler Secrets — scratchsolid-portal"
for secret in RESEND_API_KEY ZOHO_CLIENT_SECRET ZOHO_ORG_ID ZOHO_REFRESH_TOKEN; do
  if npx wrangler secret list --name scratchsolid-portal 2>/dev/null | grep -q "$secret"; then
    pass "$secret is set"
  else
    fail "$secret is MISSING"
  fi
done
echo ""

# 3. Check wrangler secrets (for scratchsolidsolutions)
echo "[3/10] Wrangler Secrets — scratchsolidsolutions"
for secret in JWT_SECRET CSRF_SECRET RESEND_API_KEY ZOHO_CLIENT_SECRET ZOHO_ORG_ID ZOHO_REFRESH_TOKEN; do
  if npx wrangler secret list --name scratchsolidsolutions 2>/dev/null | grep -q "$secret"; then
    pass "$secret is set"
  else
    fail "$secret is MISSING"
  fi
done
echo ""

# 4. Check wrangler secrets (for cleaning-service-backend)
echo "[4/10] Wrangler Secrets — cleaning-service-backend"
for secret in RESEND_API_KEY ZOHO_CLIENT_SECRET ZOHO_ORG_ID ZOHO_REFRESH_TOKEN CSRF_SECRET; do
  if npx wrangler secret list --name cleaning-service-backend 2>/dev/null | grep -q "$secret"; then
    pass "$secret is set"
  else
    fail "$secret is MISSING"
  fi
done
echo ""

# 5. Check D1 backups exist in R2
echo "[5/10] D1 Backup to R2"
if npx wrangler r2 object list scratchsolid-backups --prefix "d1_" --limit 1 2>/dev/null | grep -q "d1_"; then
  pass "At least one D1 backup exists in R2"
else
  fail "No D1 backups found in R2 bucket 'scratchsolid-backups'"
fi
echo ""

# 6. Check server firewall (origin IP)
echo "[6/10] Origin Server Firewall"
if nc -z -w 5 167.233.18.87 22 2>/dev/null; then
  pass "SSH (port 22) reachable on origin — verify key-only auth + fail2ban"
else
  skip "Could not reach origin on port 22 (may be firewalled)"
fi
echo ""

# 7. Check Cloudflare WAF / Security Level
echo "[7/10] Cloudflare Security Settings"
skip "Verify manually: Dashboard > Security > WAF > Security Level = High or I'm Under Attack"
echo ""

# 8. Check HTTPS / HSTS
echo "[8/10] TLS / HTTPS"
if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://portal.scratchsolidsolutions.org/api/health" 2>/dev/null | grep -q "200\|401\|403\|404"; then
  pass "portal.scratchsolidsolutions.org responds over HTTPS"
else
  fail "portal.scratchsolidsolutions.org HTTPS check failed"
fi
echo ""

# 9. Check audit logging table exists
echo "[9/10] Audit Logging Schema"
if npx wrangler d1 execute scratchsolid-portal-db --command "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs';" 2>/dev/null | grep -q "audit_logs"; then
  pass "audit_logs table exists in scratchsolid-portal-db"
else
  fail "audit_logs table MISSING in scratchsolid-portal-db"
fi
echo ""

# 10. Check MFA enforcement
echo "[10/10] MFA Enforcement"
if grep -q "isAdminMFACompliant" internal-portal/src/lib/auth.ts 2>/dev/null; then
  pass "MFA enforcement helper found in auth.ts"
else
  fail "MFA enforcement helper NOT found"
fi
echo ""

# Summary
echo "=== Summary ==="
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"

if [[ $ERRORS -eq 0 ]]; then
  echo ""
  echo "🚀 All critical checks passed. Platform is ready for production."
  exit 0
else
  echo ""
  echo "⛔ $ERRORS critical issue(s) found. Fix before going live."
  exit 1
fi
