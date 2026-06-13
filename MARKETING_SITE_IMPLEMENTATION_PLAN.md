# Marketing Site: Production-Grade Implementation & Stabilization Plan

**Version:** 1.0  
**Date:** June 13, 2026  
**Scope:** marketing-site (scratchsolidsolutions.org)  
**Owner:** AI Lead Architect (Cascade)  
**Review Status:** Pending User Approval

---

## Executive Summary

This plan takes the marketing site from its current state (production 500 errors, partial feature completion, missing test infrastructure) to a **world-class, production-grade application** that meets industry standards for security, reliability, performance, and user experience.

The plan is organized into **6 major phases** with clear milestones, acceptance criteria, rollback procedures, and a mandatory **3-round verification protocol** using both Selenium and Playwright end-to-end testing.

**Current State at a Glance:**
- Phase 1 (Hetzner Hosting): Complete
- Phase 2 (PostgreSQL Data Layer): Complete
- Phase 3 (Auth System): Complete
- Phase 4 (Cal.com + n8n Orchestration): Not Started
- Phase 5 (WhatsApp Real-time): Not Started
- Phase 6 (Tabler Design System): Not Started
- Phase 7 (POPIA Compliance): Not Started
- **Critical:** Production throwing 500 errors due to bound-parameter SQL bug, import-time crashes, and layout-level DB queries

---

## Phase 0: Emergency Stabilization & Foundation Repair

### Objective
Stop the bleeding. Fix every critical production issue causing 500 errors before building anything new. Remove dead code, duplicate logic, and debug artifacts.

### Milestone: P0-M1 "Zero 500s"
**Target:** Day 1-2  
**Definition of Done:** `curl https://scratchsolidsolutions.org` returns HTTP 200 with valid HTML; all public pages load without server errors.

### Tasks

| # | Task | File(s) | Risk | Rollback |
|---|------|---------|------|----------|
| 0.1 | Fix `createPasswordResetToken` bound-parameter bug: generate ISO timestamps in JS instead of passing `datetime('now', ...)` as a bound parameter | `src/lib/db.ts:208-216` | High (auth broken) | Revert to previous commit |
| 0.2 | Fix `runtime-context.ts` import-time crash: wrap `getPgD1()` and `getKVNamespace()` in lazy initialization; never throw at module load | `src/lib/runtime-context.ts` | High (app won't start) | Revert to previous commit |
| 0.3 | Fix `layout.tsx` DB query: make `getBackgroundUrl()` resilient with try/catch fallback; never let a decorative query crash the root layout | `src/app/layout.tsx` | High (every page 500s) | Revert to previous commit |
| 0.4 | Remove duplicate booking page: consolidate `/book` and `/booking` into a single canonical route; redirect the other | `src/app/book/page.tsx`, `src/app/booking/page.tsx` | Medium | Restore from git |
| 0.5 | Remove dead middleware whitelist entries: delete test/debug paths from `PUBLIC_PATHS` | `src/middleware.ts:3` | Low | Git revert |
| 0.6 | Remove `seed-services` route or lock it behind admin auth only (currently exposed) | `src/app/api/seed-services/route.ts` | Medium | Git revert |
| 0.7 | Delete `.test.ts` files from `app/api/` to prevent Next.js from treating them as API routes | `src/app/api/**/*.test.ts` | Low | Restore from git |

### Verification (Phase 0)
- [ ] Run `npm run build` successfully with zero TypeScript errors
- [ ] Run `npm run lint` with zero errors
- [ ] Run Selenium smoke test (adapted from internal-portal) against local build — all public pages pass
- [ ] Run Playwright health-check suite — all API endpoints return non-500 status
- [ ] Manual `docker-compose up` of marketing-web + marketing-postgres + marketing-redis — verify homepage loads

### Rollback Plan
- All P0 changes are isolated to specific files with git history preserved.
- If any change introduces a regression, revert the individual commit and re-test.
- Keep a `p0-stable` branch at the start of the phase for emergency rollback.

---

## Phase 1: Testing Infrastructure — "Build the Safety Net"

### Objective
Establish world-class testing infrastructure for the marketing site before writing a single new feature. Tests must cover unit, integration, API, and end-to-end layers.

### Milestone: P1-M1 "Test Harness Ready"
**Target:** Day 2-3  
**Definition of Done:** `npm test` executes a full suite; Playwright and Selenium both run successfully against the marketing site.

### Tasks

| # | Task | Details | Verification |
|---|------|---------|------------|
| 1.1 | Add `@playwright/test` to marketing-site devDependencies | `npm install -D @playwright/test` | `npx playwright --version` returns version |
| 1.2 | Create `marketing-site/playwright.config.ts` | Adapt from internal-portal config; point baseURL to `http://localhost:3001` (marketing-site port) | Config loads without errors |
| 1.3 | Create Selenium test suite for marketing site | Adapt `internal-portal/tests/selenium/portal-smoke.test.js` | `node tests/selenium/marketing-smoke.test.js` passes |
| 1.4 | Create Playwright E2E test suites | Organized into: `e2e/auth/`, `e2e/booking/`, `e2e/public/`, `e2e/api/` | `npx playwright test` passes |
| 1.5 | Create API integration test harness | Use Jest + `node-mocks-http` or direct `fetch` against running dev server | `npm test` passes |
| 1.6 | Add `test:e2e` scripts to `package.json` | `test:e2e`, `test:e2e:ui`, `test:e2e:headed`, `test:selenium` | Scripts execute |
| 1.7 | Create `tests/fixtures/` directory with test data | Standard users, bookings, services fixtures | Fixtures load in tests |
| 1.8 | Set up test database isolation | Use `pg` to create/drop test DB per run; run migrations before tests | Each test run gets clean DB |

### Test Matrix (Playwright)

| Suite | Scenarios | Browsers | Priority |
|-------|-----------|----------|----------|
| `public-pages.spec.ts` | Homepage, Services, About, Contact, Gallery | Chromium, Firefox, WebKit | High |
| `auth.spec.ts` | Signup, Login, Logout, Forgot Password, Email Verify | Chromium | Critical |
| `booking-flow.spec.ts` | Individual booking, Business booking, POP upload | Chromium | Critical |
| `api-health.spec.ts` | `/api/health`, `/api/content`, `/api/services` | Chromium | High |
| `dashboard.spec.ts` | Client dashboard, Business dashboard navigation | Chromium | High |
| `responsive.spec.ts` | Mobile viewport checks for booking flow | Mobile Chrome | Medium |

### Verification (Phase 1)
- [ ] Playwright `public-pages` suite passes in Chromium, Firefox, WebKit
- [ ] Selenium smoke test passes (all public pages + API health checks)
- [ ] Jest unit tests pass with >70% coverage on `lib/` utilities
- [ ] CI workflow updated to run marketing-site tests on every PR

### Rollback Plan
- Testing infrastructure is additive; no production code changes.
- If Playwright install fails, remove from devDependencies and retry.
- Keep internal-portal Selenium tests as reference; never delete them.

---

## Phase 2: Feature Completion — "Close the Gap"

### Objective
Implement all remaining feature phases from the technical specification that were deferred during the Cloudflare->Hetzner migration.

### Milestone: P2-M1 "Phase 4: Booking Orchestration"
**Target:** Day 4-6  
**Scope:** Cal.com webhook ingestion, n8n workflow triggers, Zoho invoice auto-creation, ERPNext shift assignment

### Tasks

| # | Task | Details | Files |
|------|------|---------|-------|
| 2.1.1 | Cal.com webhook ingestion endpoint | `POST /api/webhooks/calcom/booking` — validate signature, insert into `bookings` | `src/app/api/webhooks/calcom/route.ts` |
| 2.1.2 | n8n booking-ingested webhook | Trigger Zoho invoice creation + ERPNext shift creation | `src/app/api/webhooks/n8n/create-invoice/route.ts` |
| 2.1.3 | Auto-assign cleaner on INDIVIDUAL booking | Reuse internal-portal `autoAssignBooking()` logic | `src/lib/booking-assignment.ts` |
| 2.1.4 | Booking status tracking page | `/track/[token]` — cleaner arrival, completion, photo upload | `src/app/track/[token]/page.tsx` |
| 2.1.5 | Zoho invoice webhook | Receive payment confirmation, update booking status | `src/app/api/webhooks/zoho/payment/route.ts` |

### Milestone: P2-M2 "Phase 5: WhatsApp Real-time"
**Target:** Day 7-9  
**Scope:** WhatsApp status updates, cleaner-client communication, photo completion

### Tasks

| # | Task | Details |
|------|------|---------|
| 2.2.1 | WhatsApp inbound webhook | `POST /api/webhooks/whatsapp` — parse START/HERE/DONE keywords |
| 2.2.2 | Status update engine | Map keywords to booking status transitions |
| 2.2.3 | Cleaner arrival photo upload | Upload to R2 via presigned URL; link to `job_photos` table |
| 2.2.4 | Client notification service | Send WhatsApp + email fallback on status changes |

### Milestone: P2-M3 "Phase 6: Tabler Design System"
**Target:** Day 10-12  
**Scope:** Unify all marketing-site pages under the Tabler design system with brand colors `#1E3A8A`, `#0D9488`, `#10B981`

### Tasks

| # | Task | Details |
|------|------|---------|
| 2.3.1 | Create design tokens | CSS variables for colors, spacing, typography, shadows |
| 2.3.2 | Shared component library | Card, Button, Input, Modal, Table, Badge, Toast |
| 2.3.3 | Page-by-page redesign | Homepage, Auth, Booking, Dashboard, Services |
| 2.3.4 | Accessibility audit | WCAG 2.1 AA compliance on all redesigned pages |

### Milestone: P2-M4 "Phase 7: POPIA Compliance"
**Target:** Day 13-15  
**Scope:** South African data protection compliance

### Tasks

| # | Task | Details |
|------|------|---------|
| 2.4.1 | Consent management | Cookie consent banner; data processing consent on signup |
| 2.4.2 | Data subject rights API | `GET/DELETE /api/data-rights` — export and erase personal data |
| 2.4.3 | 48-hour purge queue | Redis-backed queue to hard-delete soft-deleted records after 48h |
| 2.4.4 | Audit trail enhancement | Log every read/write of personal data |
| 2.4.5 | Encryption at rest | Verify PostgreSQL encryption; document key management |

### Verification (Phase 2)
- [ ] Each milestone has a dedicated Playwright spec that passes
- [ ] Each new API endpoint has a Jest integration test
- [ ] Feature matrix updated: all Phase 4-7 items marked "Present"
- [ ] Security scan run on all new code (no critical/high vulnerabilities)

### Rollback Plan
- Each sub-phase (2.1, 2.2, 2.3, 2.4) is developed on its own branch (`feature/phase-4`, etc.).
- Merge to `main` only after all tests pass.
- If a feature causes production issues, disable via feature flag or revert the merge commit.
- Database migrations are forward-compatible; maintain rollback SQL scripts in `infra/migrations/rollback/`.

---

## Phase 3: Security & Compliance Hardening

### Objective
Address every Critical and High severity item from the May 23 Comprehensive Audit Report. Transform the security posture from B+ to A.

### Milestone: P3-M1 "Security Grade A"
**Target:** Day 16-18

### Tasks

| # | Task | Source Audit Item | Priority |
|------|------|-------------------|----------|
| 3.1 | Replace all `SELECT *` with explicit column lists | 17.1 | High |
| 3.2 | Add pagination (LIMIT/OFFSET) to all list queries | 17.2 | High |
| 3.3 | Add missing database indexes | 17.3 | Critical |
| 3.4 | Implement Zod schema validation for ALL API inputs | 2.5, 16.8 | Critical |
| 3.5 | Add request body size limits in middleware | 16.10 | High |
| 3.6 | Centralize CORS middleware | 4.2 | Medium |
| 3.7 | Implement API versioning (`/api/v1/...`) | 4.4 | Medium |
| 3.8 | Add retry logic with exponential backoff for Zoho/Resend | 8.3, 19.2 | High |
| 3.9 | Remove all `console.log` from production code | 9.1 | Medium |
| 3.10 | Implement structured logging with correlation IDs | 6.3 | High |
| 3.11 | Add `Content-Security-Policy` to marketing-site headers | 18.3 | Medium |
| 3.12 | Sanitize all user-generated content before rendering | 18.5 | High |

### Verification (Phase 3)
- [ ] Run `npm audit` — zero critical/high vulnerabilities
- [ ] OWASP ZAP or similar scan against local build — zero SQL injection, XSS findings
- [ ] Database index check: `EXPLAIN` on all frequently-queried columns shows index usage
- [ ] All API endpoints tested with malformed input — return 400, never 500

### Rollback Plan
- Security changes are low-risk individually; most are additive (new middleware, stricter validation).
- Database index additions are backward-compatible; dropping an index is the rollback.
- If Zod validation is too strict, temporarily relax specific schemas while keeping the framework.

---

## Phase 4: Performance & Polish

### Objective
Optimize every layer — database queries, bundle size, image delivery, caching — and deliver a flawless user experience.

### Milestone: P4-M1 "Lighthouse 90+"
**Target:** Day 19-20

### Tasks

| # | Task | Target |
|------|------|--------|
| 4.1 | Implement Redis-based caching for static/reference data | 95% cache hit rate on services/pricing |
| 4.2 | Add query result caching for read-heavy endpoints | `/api/services`, `/api/pricing`, `/api/content` |
| 4.3 | Optimize Next.js bundle | Analyze with `@next/bundle-analyzer`; split heavy deps |
| 4.4 | Re-enable Next.js image optimization (currently `unoptimized: true`) | Use R2/Cloudflare for optimized delivery |
| 4.5 | Add database query timeouts | 10s max per query |
| 4.6 | Implement background session cleanup | Cron job or Redis queue instead of on-login cleanup |
| 4.7 | Add performance monitoring | Web Vitals reporting to endpoint |
| 4.8 | Responsive design audit | All pages pass on 320px, 768px, 1024px, 1440px |

### Verification (Phase 4)
- [ ] Lighthouse CI run: Performance >90, Accessibility >95, Best Practices >95, SEO >90
- [ ] Playwright performance test: booking flow completes in <3s on simulated 3G
- [ ] Database slow query log: zero queries >1s on typical load

### Rollback Plan
- Caching is additive; disable caching via env var `CACHE_ENABLED=false` for instant rollback.
- Image optimization change is in `next.config.ts` only; revert one line.

---

## Phase 5: The Three-Round Verification Protocol

### Objective
Run the complete test suite three full times, fixing every flake, race condition, and edge case discovered. This is the final gate before production deployment.

### Protocol

**Round 1: Automated Test Blitz (Day 21)**
1. Run Jest unit + integration tests 3 times in a row (`npm test -- --runInBand` x3)
2. Run Playwright E2E suite 3 times in a row (`npx playwright test --repeat-each=3`)
3. Run Selenium smoke test 3 times in a row
4. Record every failure, categorize as: `code bug`, `test flake`, `env issue`
5. Fix all `code bug` items; fix `test flake` items by adding waits, retries, or stabilizing selectors

**Round 2: Manual Verification Matrix (Day 22)**
1. Execute the manual verification matrix (see below)
2. Cross-browser check: Chrome, Firefox, Safari, Edge (latest 2 versions)
3. Mobile check: iOS Safari, Android Chrome
4. Accessibility check: axe DevTools scan on every page
5. Security check: OWASP ZAP scan on full API surface

**Round 3: Staging Battle Test (Day 23)**
1. Deploy to staging environment (`staging.scratchsolidsolutions.org`)
2. Run full Playwright suite against staging URL
3. Run full Selenium suite against staging URL
4. Load test: simulate 100 concurrent users booking simultaneously
5. Monitor error rates for 24 hours
6. If any 500s or >1% error rate, stop and fix

### Manual Verification Matrix

| Flow | Steps | Expected Result | Pass Criteria |
|------|-------|-----------------|---------------|
| Public Landing | Visit `/` | Hero section loads, no console errors | 200 OK, no SEVERE logs |
| Individual Booking | Navigate booking flow → fill form → submit | Booking created, tracking token returned | 201 Created, DB row exists |
| Business Booking | Navigate business flow → fill form → submit | Booking created, contract flag set | 201 Created |
| Auth Signup | Create account → verify email → login | Session established, cookie set | 200 OK, `client_auth_token` cookie present |
| Auth Login | Login with email + password | Dashboard redirect, user data loaded | 200 OK, localStorage has user |
| Auth Logout | Click logout | Cookie cleared, redirect to `/auth` | 200 OK, cookie absent |
| Password Reset | Request reset → click link → set new password | Password updated, can login | 200 OK at each step |
| Dashboard Navigation | Visit client dashboard → view bookings → edit profile | All sections load data | No 500s, data populated |
| POP Upload | Booking with EFT → upload POP → verify | File stored in R2, status updated | 200 OK, DB updated |
| WhatsApp Status | Cleaner sends "START" → status updates | Booking status = on_way | Webhook 200, DB updated |
| Data Export | Authenticated user requests data export | JSON download with all personal data | 200 OK, valid JSON |
| Data Deletion | User requests account deletion | Soft delete, 48h purge queued | 200 OK, `deleted=1` |

### Verification Gates
- [ ] **Gate 1:** Round 1 automated tests pass 3/3 with zero flakes
- [ ] **Gate 2:** Round 2 manual matrix passes 100%
- [ ] **Gate 3:** Round 3 staging battle test: zero 500s, zero critical console errors, 100% booking success rate
- [ ] **Gate 4:** Security scan passes with no new findings
- [ ] **Gate 5:** Performance budget met (Lighthouse 90+, bundle <500KB initial)

---

## Phase 6: Production Deployment & Go-Live

### Objective
Deploy to production with zero downtime, comprehensive monitoring, and a bulletproof rollback plan.

### Milestone: P6-M1 "Production Live"
**Target:** Day 24

### Deployment Checklist

| # | Step | Owner | Verification |
|---|------|-------|------------|
| 6.1 | Tag release candidate: `git tag -a v1.0.0-rc1 -m "Marketing site production candidate"` | Dev | Tag exists |
| 6.2 | Run full CI pipeline: build, test, lint, security scan | CI | All green |
| 6.3 | Build Docker image: `docker build -t marketing-site:v1.0.0-rc1 .` | Dev | Image builds |
| 6.4 | Push to container registry | Dev | Image pushed |
| 6.5 | Deploy to Hetzner via Docker Compose pull | Dev | `docker-compose pull && docker-compose up -d` |
| 6.6 | Run database migrations | Dev | All migrations applied |
| 6.7 | Verify health endpoints | Dev | `/api/health` returns 200 with all green |
| 6.8 | Run smoke tests against production | Automated | Selenium + Playwright pass |
| 6.9 | Monitor for 2 hours | Dev | Uptime Kuma shows green |

### Rollback Plan (Critical)

**Trigger Conditions:**
- Any 500 error rate >0.1% for 5 minutes
- Booking creation failure rate >1%
- Lighthouse performance score drops below 80
- Any security scan failure

**Rollback Steps (5-minute target):**
1. `docker-compose down marketing-web`
2. `docker pull marketing-site:previous-stable`
3. `docker-compose up -d marketing-web`
4. Verify `/api/health` returns 200
5. Run Selenium smoke test
6. If rollback fails, restore from Docker volume backup (`marketing-postgres` has daily snapshot)

**Rollback Verification:**
- [ ] Homepage loads in <2s
- [ ] `/api/health` returns all green
- [ ] Booking flow completes end-to-end
- [ ] No 500 errors in logs for 10 minutes

---

## Timeline & Milestones Summary

| Phase | Duration | Start | End | Key Milestone |
|-------|----------|-------|-----|---------------|
| P0: Stabilization | 2 days | Day 1 | Day 2 | P0-M1: Zero 500s |
| P1: Testing Infra | 2 days | Day 2 | Day 3 | P1-M1: Test Harness Ready |
| P2: Features | 12 days | Day 4 | Day 15 | P2-M4: All Phases Complete |
| P3: Security | 3 days | Day 16 | Day 18 | P3-M1: Security Grade A |
| P4: Performance | 2 days | Day 19 | Day 20 | P4-M1: Lighthouse 90+ |
| P5: 3-Round Verify | 3 days | Day 21 | Day 23 | All Gates Pass |
| P6: Deploy | 1 day | Day 24 | Day 24 | Production Live |
| **Total** | **24 days** | | | |

**Weekly Sprint Breakdown:**
- **Week 1 (Days 1-7):** Stabilization, testing infra, Phase 4 booking orchestration
- **Week 2 (Days 8-14):** Phase 5 WhatsApp, Phase 6 Tabler Design
- **Week 3 (Days 15-21):** Phase 7 POPIA, security hardening, performance, Round 1-2 verification
- **Week 4 (Days 22-24):** Round 3 staging battle test, production deployment

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PostgreSQL schema mismatch on fresh deploy | Medium | Critical | Include schema init script in Docker entrypoint; test on clean DB |
| n8n/Cal.com webhook format changes | Low | High | Version webhook handlers; log full payload for debugging |
| WhatsApp Meta API rate limits | Medium | Medium | Implement circuit breaker; fallback to email |
| Playwright test flakiness | High | Low | Use `retries: 2`, stable selectors (`data-testid`), explicit waits |
| Zoho API downtime during invoice creation | Medium | High | Queue failed invoices in Redis; retry with exponential backoff |
| Bundle size exceeds budget | Low | Medium | Code splitting, tree shaking, analyze with `@next/bundle-analyzer` |
| POPIA legal review delays | Medium | Medium | Implement conservative defaults; flag for legal review in Week 3 |

---

## Definition of Done (Global)

Every task, feature, and fix in this plan must satisfy ALL of the following before being considered complete:

1. **Code Quality:** Passes ESLint with zero errors; TypeScript strict mode clean
2. **Tests:** Unit tests cover the happy path and at least 2 edge cases; integration test covers the full flow
3. **Playwright:** At least one E2E spec passes that exercises the feature in a real browser
4. **Selenium:** The smoke test suite still passes after the change
5. **Security:** No new vulnerabilities introduced; scan passes
6. **Performance:** No Lighthouse regression >5 points
7. **Documentation:** README or inline docs updated if the change affects API or user flow
8. **Rollback:** The change can be reverted with a single `git revert` or env var toggle

---

## Success Criteria (Final)

The project is considered successfully completed when:

- [ ] `scratchsolidsolutions.org` loads with zero 500 errors for 7 consecutive days
- [ ] Booking success rate >99% (measured via analytics)
- [ ] Lighthouse score >90 on all 4 categories (Performance, Accessibility, Best Practices, SEO)
- [ ] Playwright E2E suite passes 3/3 consecutive runs with zero flakes
- [ ] Selenium smoke test passes 3/3 consecutive runs
- [ ] Security audit: zero Critical/High findings
- [ ] All 7 phases from the technical specification are implemented and verified
- [ ] POPIA compliance checklist signed off
- [ ] Staging and production environments are documented and reproducible

---

## Appendices

### A. Testing Commands Reference

```bash
# Unit + Integration
npm test

# Playwright (headless)
npx playwright test

# Playwright (headed debugging)
npx playwright test --headed

# Playwright (UI mode)
npx playwright test --ui

# Selenium
node tests/selenium/marketing-smoke.test.js

# Build
npm run build

# Lint
npm run lint

# Lighthouse
npm install -g lighthouse
lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html
```

### B. Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Cache
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=<64-char-random>
CSRF_SECRET=<32-char-random>

# Email
RESEND_API_KEY=<resend-key>

# Object Storage
S3_ENDPOINT=<r2-or-minio-endpoint>
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=<bucket-name>

# Zoho
ZOHO_CLIENT_ID=<id>
ZOHO_CLIENT_SECRET=<secret>
ZOHO_REFRESH_TOKEN=<token>
ZOHO_ORG_ID=<org-id>

# WhatsApp (Phase 5)
META_WHATSAPP_TOKEN=<token>
META_WHATSAPP_PHONE_ID=<phone-id>

# Optional / Phase-specific
NEXT_PUBLIC_BASE_URL=https://scratchsolidsolutions.org
NEXT_PUBLIC_API_URL=https://api.scratchsolidsolutions.org/api
```

### C. Files to Review Before Approval

This plan references the following source files that were audited:
- `marketing-site/src/lib/db.ts` (bound-parameter bug, SELECT *, pagination)
- `marketing-site/src/lib/runtime-context.ts` (import-time crash)
- `marketing-site/src/app/layout.tsx` (DB query in layout)
- `marketing-site/src/middleware.ts` (dead whitelist entries)
- `marketing-site/src/app/api/seed-services/route.ts` (exposed dev route)
- `marketing-site/next.config.ts` (image optimization, console removal)
- `infra/docker-compose.yml` (marketing-web, marketing-postgres, marketing-redis)

---

*End of Plan*

**Prepared by:** Cascade AI Architect  
**Status:** Awaiting user review and approval before execution begins.
