# Scratch Solid Solutions — Production Deployment Guide

## Architecture Overview

| Service | Platform | Domain |
|---|---|---|
| Marketing Site | Cloudflare Pages | `scratchsolid.com` |
| Internal Portal | Cloudflare Pages | `portal.scratchsolid.com` |
| Backend Worker | Cloudflare Workers | `api.scratchsolid.com` |
| Database | Cloudflare D1 | `scratchsolid-db` |
| File Storage | Cloudflare R2 | `scratchsolid-assets` |
| CMS | Directus (Docker) | `cms.scratchsolid.com` |

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
**CRITICAL: Never commit secrets to wrangler.toml**

```bash
# Backend Worker secrets
cd backend-worker
wrangler secret put JWT_SECRET
# Generate with: openssl rand -base64 48

# Marketing Site secrets (set in Cloudflare Pages dashboard > Settings > Environment variables)
JWT_SECRET=<same-as-above>
R2_BUCKET=scratchsolid-assets
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<your-r2-key>
R2_SECRET_ACCESS_KEY=<your-r2-secret>
ZOHO_ORG_ID=<your-zoho-org-id>
ZOHO_CLIENT_ID=<your-zoho-client-id>
ZOHO_CLIENT_SECRET=<your-zoho-client-secret>
ZOHO_REFRESH_TOKEN=<your-zoho-refresh-token>
DIRECTUS_URL=https://cms.scratchsolid.com
DIRECTUS_TOKEN=<your-directus-token>

# Internal Portal secrets (set in Cloudflare Pages dashboard)
JWT_SECRET=<same-as-above>
```

### 3. Build & Deploy

```bash
# Marketing Site
cd marketing-site
npm run build
wrangler pages deploy .vercel/output/static --project-name=scratchsolidsolutions

# Internal Portal
cd internal-portal
npm run build
wrangler pages deploy .vercel/output/static --project-name=scratchsolid-portal

# Backend Worker
cd backend-worker
wrangler deploy
```

### 4. DNS Configuration
In Cloudflare dashboard:
- `scratchsolid.com` → Marketing Site (Pages custom domain)
- `portal.scratchsolid.com` → Internal Portal (Pages custom domain)
- `api.scratchsolid.com` → Backend Worker (Custom domain in Workers settings)

### 5. Post-Deployment Verification
- [ ] Visit `https://scratchsolid.com` — loads correctly
- [ ] Visit `https://portal.scratchsolid.com` — loads correctly
- [ ] Test login flow on both sites
- [ ] Test signup with password policy enforcement
- [ ] Test failed login lockout (5 attempts → 15 min lock)
- [ ] Verify HSTS header: `curl -I https://scratchsolid.com | grep Strict-Transport`
- [ ] Verify CSP header: `curl -I https://scratchsolid.com | grep Content-Security-Policy`
- [ ] Verify CORS: `curl -H "Origin: https://evil.com" https://api.scratchsolid.com/health` → should NOT return `Access-Control-Allow-Origin: https://evil.com`
- [ ] Test file upload (authenticated only, file type + size limits)
- [ ] Verify Directus CMS connection

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
| `R2_BUCKET` | Marketing | Yes | R2 bucket name for uploads |
| `R2_ACCOUNT_ID` | Marketing | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Marketing | Yes | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Marketing | Yes | R2 API secret key |
| `ZOHO_ORG_ID` | Marketing | Yes | Zoho Books organization ID |
| `ZOHO_CLIENT_ID` | Marketing | Yes | Zoho OAuth client ID |
| `ZOHO_CLIENT_SECRET` | Marketing | Yes | Zoho OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | Marketing | Yes | Zoho OAuth refresh token |
| `DIRECTUS_URL` | Marketing | Yes | Directus CMS URL |
| `DIRECTUS_TOKEN` | Marketing | Yes | Directus API token |
