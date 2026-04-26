# Scratch Solid Solutions — Production Deployment Guide

## Architecture Overview

| Service | Component | Type | Domain | Notes |
|---|---|---|---|
| Marketing Site | Cloudflare Worker with Assets (OpenNext) | `scratchsolidsolutions.org` | Next.js 16.2.3 |
| Internal Portal | Cloudflare Worker with Assets (OpenNext) | `portal.scratchsolidsolutions.org` | Next.js 16.2.4 |
| Backend Worker | Cloudflare Worker | `api.scratchsolid.com` | Zoho integration, notifications |
| File Storage | Cloudflare R2 | `scratchsolid-assets` |

## CRITICAL: Secrets Management

**NEVER commit secrets to wrangler.toml or wrangler.jsonc files.**
- Secrets must be set via Cloudflare dashboard or API as `secret_text` bindings
- Do NOT define JWT_SECRET, RESEND_API_KEY, or other sensitive values in wrangler configuration files
- If secrets are defined in wrangler config files, they will overwrite the actual secrets during deployment

**Correct way to set secrets:**
1. Go to Cloudflare Dashboard → Workers & Pages → [Worker Name] → Settings → Variables and Secrets
2. Add secrets as "Secret text" type (NOT "Plain text")
3. Use the Cloudflare API for programmatic secret management

## Pre-Deployment Checklist

### 1. Database Migration
Apply the schema to D1 production database:
```bash
wrangler d1 execute scratchsolid-db --file=schema.sql --remote
```

For existing databases, run ALTER statements for new columns:
```bash
wrangler d1 execute scratchsolid-db --remote --command="ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0"
wrangler d1 execute scratchsolid-db --remote --command="ALTER TABLE users ADD COLUMN locked_until TEXT DEFAULT NULL"
wrangler d1 execute scratchsolid-db --remote --command="ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''"
wrangler d1 execute scratchsolid-db --remote --command="ALTER TABLE users ADD COLUMN address TEXT DEFAULT ''"
wrangler d1 execute scratchsolid-db --remote --command="ALTER TABLE users ADD COLUMN business_name TEXT DEFAULT ''"
wrangler d1 execute scratchsolid-db --remote --command="ALTER TABLE users ADD COLUMN business_registration TEXT DEFAULT ''"
wrangler d1 execute scratchsolid-db --remote --command="ALTER TABLE users ADD COLUMN business_info TEXT DEFAULT ''"
```

### 2. Set Cloudflare Secrets
**CRITICAL: Never commit secrets to wrangler.toml or wrangler.jsonc**

Set secrets via Cloudflare Dashboard → Workers & Pages → [Worker Name] → Settings → Variables and Secrets:

**Marketing Site (scratchsolidsolutions Worker):**
- JWT_SECRET (Secret text) - Generate with: `openssl rand -base64 48`
- RESEND_API_KEY (Secret text)
- CSRF_SECRET (Secret text)
- ZOHO_ORG_ID (Secret text)
- ZOHO_CLIENT_ID (Secret text)
- ZOHO_CLIENT_SECRET (Secret text)
- ZOHO_REFRESH_TOKEN (Secret text)

**Internal Portal (scratchsolid-portal Worker):**
- JWT_SECRET (Secret text) - Use same as marketing site
- CSRF_SECRET (Secret text)
- ZOHO_AUTH_TOKEN (Secret text)
- ZOHO_ORG_ID (Secret text)
- ZOHO_CLIENT_ID (Secret text)
- ZOHO_CLIENT_SECRET (Secret text)
- ZOHO_REFRESH_TOKEN (Secret text)
- WHATSAPP_API_KEY (Secret text)
- WHATSAPP_PHONE_ID (Secret text)
- EMAIL_API_KEY (Secret text)

**Backend Worker:**
Set via command line:
```bash
cd backend-worker
wrangler secret put JWT_SECRET
```

### 3. Build & Deploy (OpenNext Method)

**IMPORTANT: Use OpenNext deployment, NOT Pages deployment**

```bash
# Marketing Site
cd marketing-site
npm ci
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy

# Internal Portal
cd internal-portal
npm ci
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy

# Backend Worker
cd backend-worker
wrangler deploy
```

**Deployment Environment:**
- Use GitHub Codespaces or Linux environment (not Windows)
- Windows may encounter EPERM/EBUSY errors during OpenNext build
- Set CLOUDFLARE_API_TOKEN environment variable for non-interactive deployment

### 4. DNS Configuration
In Cloudflare dashboard:
- `scratchsolidsolutions.org` → Marketing Site (Worker custom domain)
- `portal.scratchsolidsolutions.org` → Internal Portal (Worker custom domain)
- `api.scratchsolid.com` → Backend Worker (Custom domain in Workers settings)

### 5. Post-Deployment Verification
- [ ] Visit `https://scratchsolidsolutions.org` — loads correctly
- [ ] Visit `https://portal.scratchsolidsolutions.org` — loads correctly
- [ ] Test login flow on both sites
- [ ] Test signup with password policy enforcement
- [ ] Test failed login lockout (5 attempts → 15 min lock)
- [ ] Verify HSTS header: `curl -I https://scratchsolidsolutions.org | grep Strict-Transport`
- [ ] Verify CSP header: `curl -I https://scratchsolidsolutions.org | grep Content-Security-Policy`
- [ ] Verify CORS: `curl -H "Origin: https://evil.com" https://api.scratchsolid.com/health` → should NOT return `Access-Control-Allow-Origin: https://evil.com`
- [ ] Test file upload (authenticated only, file type + size limits)
- [ ] Verify secrets are set as secret_text (not plain_text) in Worker bindings

## Security Posture Summary

### Authentication & IAM
- JWT tokens with 24h expiry, signed with required env var `JWT_SECRET`
- bcrypt password hashing (cost 10) on Next.js routes
- PBKDF2 (100k iterations, SHA-256) on Cloudflare Workers
- Password policy: 8+ chars, uppercase, lowercase, digit, special character
- Account lockout: 5 failed attempts → 15 min lock
- Session tokens with 30-day server-side expiry in D1
- Role-based access control (admin, business, client, cleaner, digital, transport)
- No cookie-based auth fallback (Authorization header only — CSRF safe)

### API Security
- All endpoints require authentication except: `/health`, `/auth/login`, `/auth/signup`, `/content/[page]`
- Rate limiting: 100 req/min per IP (in-memory) + KV-backed option for distributed
- Security headers on every response (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, etc.)
- CORS restricted to known origins only
- Request tracing with X-Request-ID / X-Trace-ID

### Input Validation & XSS Protection
- All SQL queries use parameterized bindings (zero raw interpolation)
- `sanitizeString()` — HTML entity encoding for all text inputs
- `sanitizeEmail()` — lowercase + character whitelist
- `sanitizePhone()` — digit/symbol whitelist
- Column whitelist on dynamic UPDATE queries (`updateCleanerProfile`)
- File upload: type whitelist (JPEG, PNG, GIF, WebP, PDF), 5MB limit, filename sanitization
- No `dangerouslySetInnerHTML` or `.innerHTML` usage in any component
- CSP headers block inline script execution

### Database Security
- Cloudflare D1 (serverless, no direct network access)
- Parameterized queries throughout
- `SELECT` column restrictions (no `password_hash` in non-auth queries)
- Soft delete pattern (no hard deletes)
- Audit logging table for admin actions
- Performance indexes on all query columns

### Known Remaining Hardening Items
- CSP `unsafe-inline`/`unsafe-eval` — requires nonce-based CSP migration
- Legacy SHA256 password hashes in backend-worker — add migration on next login
- In-memory rate limiting — wire `withKVRateLimit` as primary for distributed enforcement
- Zoho access token stored in module variable — migrate to KV for isolate isolation

## Environment Variables Reference

| Variable | Service | Required | Description |
|---|---|---|---|
| `JWT_SECRET` | All | Yes | 48+ char random base64 string |
| `RESEND_API_KEY` | Marketing | Yes | Resend API key for email services |
| `R2_BUCKET` | Marketing | Yes | R2 bucket name for uploads |
| `R2_ACCOUNT_ID` | Marketing | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Marketing | Yes | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Marketing | Yes | R2 API secret key |
| `ZOHO_ORG_ID` | Marketing | Yes | Zoho Books organization ID |
| `ZOHO_CLIENT_ID` | Marketing | Yes | Zoho OAuth client ID |
| `ZOHO_CLIENT_SECRET` | Marketing | Yes | Zoho OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | Marketing | Yes | Zoho OAuth refresh token |
