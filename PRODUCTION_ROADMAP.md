# Production Readiness Roadmap — Scratch Solid Solutions
## New Way of Working: Audit → Fix → Deploy → Verify → Gate → Next Phase

---

## Phase 0: Fix Deployment Pipeline ✅ COMPLETE
- **Milestone:** GitHub Actions production deploy succeeds end-to-end
- **Deploy tag:** v2.0.17
- **Verification:** 23/23 production endpoints passing, 5/5 staging endpoints passing
- **Status:** GREEN

---

## Phase 1: Remove Debug Artifacts & Fix TypeScript Errors
### Audit Scope
- All `/api/debug/*` routes across all apps
- All debug logging, console.log statements in production routes
- TypeScript compilation errors (`npx tsc --noEmit`) in marketing-site and internal-portal
- Unused imports and dead code

### Fixes
- Delete `marketing-site/src/app/api/debug/route.ts` if exists
- Delete any other debug routes
- Fix all `tsc --noEmit` errors in marketing-site
- Fix all `tsc --noEmit` errors in internal-portal
- Clean up console.log/debug statements in production API routes

### Test
- `npx tsc --noEmit` passes clean in both apps
- Endpoint audit still passes after changes

### Deploy
- Tag: v2.0.18
- Verify: GitHub Actions all green, endpoint audit 23/23 passing

---

## Phase 2: Fix Marketing Site Login Flow
### Audit Scope
- `marketing-site/src/app/api/auth/login/route.ts`
- `marketing-site/src/lib/session.ts`
- `marketing-site/src/lib/db.ts`
- Database `users` table schema and seed data
- JWT_SECRET binding in Cloudflare
- Complete login request/response flow

### Fixes
- Root-cause "An unexpected error occurred" on login
- Fix any JWT signing/verification issues
- Fix any database query issues
- Fix any bcrypt compatibility issues on Workers edge runtime

### Test
- Successful login with seed user credentials
- Failed login returns proper 401 (not 500)
- Token is valid and usable for authenticated routes

### Deploy
- Tag: v2.0.19
- Verify: Login works in production, endpoint audit passes

---

## Phase 3: Fix Portal Login Flow
### Audit Scope
- `internal-portal/src/app/api/auth/login/route.ts`
- `internal-portal/src/lib/auth.ts`
- `internal-portal/src/lib/session.ts`
- Portal middleware and auth-middleware
- Database schema for portal users

### Fixes
- Ensure jose-based JWT works for portal login
- Verify staff/cleaner/admin login paths all work
- Fix any middleware auth failures

### Test
- Admin login succeeds
- Cleaner login (paysheet code + password) succeeds
- Staff login succeeds
- Logout and refresh token flows work

### Deploy
- Tag: v2.0.20
- Verify: All login paths work in production

---

## Phase 4: Fix Zoho Integration
### Audit Scope
- Zoho Books API credentials (wrangler secrets)
- OAuth token refresh flow
- All Zoho-related routes (`/api/zoho/*`)
- Backend worker Zoho health check vs actual API calls
- Invoice/quote creation endpoints

### Fixes
- Fix Zoho OAuth token if expired
- Fix any route mismatches (backend vs portal Zoho endpoints)
- Ensure `/api/zoho/quotes` responds correctly

### Test
- Zoho health check returns actual "connected" status
- Quote creation works end-to-end
- Invoice retrieval works

### Deploy
- Tag: v2.0.21
- Verify: Zoho endpoints functional in production

---

## Phase 5: Comprehensive End-to-End Flow Testing
### Audit Scope
- Marketing site: homepage → services → book → signup → login → client dashboard
- Portal: login → admin dashboard → cleaner management → settings
- Backend API: all public and protected endpoints
- Cross-app integration: marketing-site proxy calls to backend
- Database migrations: ensure all tables exist in production D1

### Fixes
- Fix any broken navigation or redirects
- Fix any broken forms or API calls
- Fix any missing pages or 404s
- Fix any data not loading from database

### Test
- Selenium comprehensive test passes
- Playwright E2E tests pass
- Manual flow verification checklist

### Deploy
- Tag: v2.0.22
- Verify: All critical user flows work in production

---

## Phase 6: Security & Secrets Audit
### Audit Scope
- All wrangler secrets across all 3 workers
- JWT_SECRET strength and consistency
- CSRF protection on all mutating endpoints
- Rate limiting effectiveness
- CORS headers on API responses
- Security headers (CSP, HSTS, etc.)

### Fixes
- Set any missing secrets
- Strengthen any weak secrets
- Fix any missing CSRF validation
- Fix any missing rate limiting

### Test
- Security headers present on all responses
- Rate limiting triggers correctly
- CSRF tokens validated on POST/PUT/DELETE

### Deploy
- Tag: v2.0.23
- Verify: Security audit passes

---

## Phase 7: Performance & Monitoring
### Audit Scope
- Page load times (Lighthouse/Core Web Vitals)
- API response times
- Database query performance
- Error logging and alerting
- Health check endpoints

### Fixes
- Optimize slow queries
- Add caching where appropriate
- Fix any memory leaks
- Ensure error alerting is working

### Test
- Lighthouse score > 90 for marketing homepage
- API health checks respond < 200ms
- No unhandled errors in production logs

### Deploy
- Tag: v2.0.24
- Verify: Performance benchmarks met

---

## Master Deploy Gate Rule
**NO phase may begin until the previous phase is:**
1. ✅ All fixes committed
2. ✅ Tagged and pushed
3. ✅ GitHub Actions all green
4. ✅ Production endpoint audit passing
5. ✅ Staging endpoint audit passing
6. ✅ Phase-specific tests passing

---

## Current Status
- **Phase 0:** ✅ COMPLETE (v2.0.17 deployed, all green)
- **Phase 1:** ✅ COMPLETE (v2.0.18 deployed, all green)
- **Phase 2:** ✅ COMPLETE (v2.0.19 deployed, all green)
- **Phase 3:** ✅ COMPLETE (v2.0.20 deployed, all green)
- **Phase 4:** ✅ CODE COMPLETE (v2.0.21 deployed, all green) — External dependency: Zoho refresh token expired, requires user dashboard re-auth
- **Next:** Phase 5 — WhatsApp Meta Cloud API
