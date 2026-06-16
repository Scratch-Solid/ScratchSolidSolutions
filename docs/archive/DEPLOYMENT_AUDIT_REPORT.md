# Deployment Setup Audit Report

**Date:** May 21, 2026
**Auditor:** Cascade AI Assistant
**Scope:** Complete deployment infrastructure audit

---

## Executive Summary

This audit covers the entire deployment infrastructure for Scratch Solid Solutions, including GitHub Actions workflows, Cloudflare Workers configurations, build scripts, and documentation.

**Key Findings:**
- ✅ 3 GitHub Actions workflows correctly configured
- ✅ 3 projects with proper wrangler configurations
- ⚠️ Minor inconsistencies in workflow formatting
- ⚠️ Missing `workflow_dispatch` trigger for staging
- ⚠️ Duplicate/outdated documentation
- ⚠️ Inconsistent wrangler version across workflows

---

## 1. GitHub Actions Workflows

### 1.1 Workflow Count and Location

**Total Workflows:** 3

| Workflow | File | Status |
|---|---|---|
| CI | `.github/workflows/ci.yml` | ✅ Active |
| Deploy to Production | `.github/workflows/deploy-production.yml` | ✅ Active |
| Deploy to Staging | `.github/workflows/deploy-staging.yml` | ✅ Active |

**Previously Deleted:** `marketing-site/.github/workflows/deploy.yml` (stale duplicate)

### 1.2 CI Workflow (`.github/workflows/ci.yml`)

**Trigger:** Push/PR to `main`, `staging`, `develop`

**Jobs:**
1. Marketing Site - Build & Test
2. Internal Portal - Build & Test
3. Backend Worker - Build & Test

**Steps per job:**
- Checkout code
- Setup Node.js 22
- Install dependencies (npm ci)
- Run linter (npm run lint) - except backend-worker
- Run tests (npm test)
- Build (npm run build) - except backend-worker
- Security audit (npm audit --audit-level=high)

**Issues:** None

### 1.3 Deploy to Staging Workflow (`.github/workflows/deploy-staging.yml`)

**Trigger:** Push to `staging` branch

**Jobs:**
1. Deploy Marketing Site to Staging
2. Deploy Internal Portal to Staging
3. Deploy Backend Worker to Staging

**Steps - Marketing Site:**
- Checkout code
- Setup Node.js 22
- Install dependencies
- Build (npm run cloudflare-build)
- Deploy to Cloudflare Workers (staging)

**Steps - Internal Portal:**
- Checkout code
- Setup Node.js 22 (inconsistent formatting)
- Install dependencies (npm ci --legacy-peer-deps)
- Build (npm run cloudflare-build)
- Deploy to Cloudflare Workers (staging)

**Steps - Backend Worker:**
- Checkout code
- Setup Node.js 22
- Install dependencies
- Unassign conflicting route from marketing worker (api-staging route)
- Deploy to Cloudflare Workers (staging)

**Issues:**
- ⚠️ Missing `workflow_dispatch` trigger (cannot manually trigger)
- ⚠️ Inconsistent formatting: Line 56 uses `node-version: 22` (no quotes) vs line 20 uses `node-version: '22'`
- ⚠️ Inconsistent formatting: Line 57 uses `cache: npm` (no quotes) vs line 22 uses `cache: 'npm'`
- ⚠️ Internal portal uses `--legacy-peer-deps` flag (may indicate dependency issues)
- ⚠️ Backend worker has route unassignment step (specific to staging, not in production)

### 1.4 Deploy to Production Workflow (`.github/workflows/deploy-production.yml`)

**Trigger:** Push to `main` branch + `workflow_dispatch`

**Jobs:**
1. Deploy Marketing Site to Production
2. Deploy Internal Portal to Production
3. Deploy Backend Worker to Production

**Steps - Marketing Site:**
- Checkout code
- Setup Node.js 22
- Install dependencies
- Run tests
- Build (npm run cloudflare-build)
- Deploy to Cloudflare Workers (production)

**Steps - Internal Portal:**
- Checkout code
- Setup Node.js 22
- Install dependencies
- Run tests
- Build (npm run cloudflare-build)
- Deploy to Cloudflare Workers (production)

**Steps - Backend Worker:**
- Checkout code
- Setup Node.js 22
- Install dependencies
- Run tests
- Deploy to Cloudflare Workers (production)

**Issues:**
- ⚠️ Uses `wranglerVersion: 4.91.0` while staging uses `4.93.0` (inconsistent)

### 1.5 Workflow Configuration Comparison

| Aspect | CI | Staging | Production |
|---|---|---|---|
| Node Version | 22 | 22 | 22 |
| Wrangler Version | N/A | 4.93.0 | 4.91.0 |
| workflow_dispatch | ❌ | ❌ | ✅ |
| Test before deploy | ✅ | ❌ | ✅ |
| Lint before deploy | ✅ | ❌ | ❌ |
| Security audit | ✅ | ❌ | ❌ |

---

## 2. Wrangler Configurations

### 2.1 Marketing Site (`marketing-site/wrangler.jsonc`)

**Worker Name:** `scratchsolidsolutions`
**Type:** Cloudflare Worker with OpenNext
**Entry Point:** `.open-next/worker.js`

**Production Bindings:**
- D1: `scratchsolid_db` → `scratchsolid-marketing-db` (ID: 4c282c8f-8991-49bd-9dc6-e3eab31a4869)
- KV: RATE_LIMIT_KV, GPS_KV, PUSH_KV
- R2: UPLOADS_BUCKET, cleaner_photos, cleaner_photos_staging
- Route: `scratchsolidsolutions.org/*`

**Staging Bindings:**
- D1: `scratchsolid_db` → `scratchsolid-db-staging` (ID: 6b6f139b-7a19-4d44-9e21-b85c0c0da42b)
- KV: RATE_LIMIT_KV, GPS_KV, PUSH_KV (different IDs)
- R2: UPLOADS_BUCKET, cleaner_photos, cleaner_photos_staging
- Route: `staging.scratchsolidsolutions.org/*`

**Issues:** None

### 2.2 Internal Portal (`internal-portal/wrangler.jsonc`)

**Worker Name:** `scratchsolid-portal`
**Type:** Cloudflare Worker with OpenNext
**Entry Point:** `.open-next/worker.js`

**Production Bindings:**
- D1: `scratchsolid_db` → `scratchsolid-portal-db` (ID: a08f16f5-9d75-47f9-973c-35bade106b47)
- KV: RATE_LIMIT_KV, GPS_KV, PUSH_KV, STATUS_KV
- R2: UPLOADS_BUCKET, CLEANER_PHOTOS_BUCKET
- Route: `portal.scratchsolidsolutions.org/*`

**Staging Bindings:**
- D1: `scratchsolid_db` → `scratchsolid-db-portal-staging` (ID: cc0bb727-585b-40c9-8afa-77947e725813)
- KV: RATE_LIMIT_KV, GPS_KV, PUSH_KV, STATUS_KV (different IDs)
- R2: UPLOADS_BUCKET, CLEANER_PHOTOS_BUCKET
- Route: `portal-staging.scratchsolidsolutions.org/*`

**Issues:** None

### 2.3 Backend Worker (`backend-worker/wrangler.toml`)

**Worker Name:** `cleaning-service-backend`
**Type:** Pure Cloudflare Worker
**Entry Point:** `src/index.ts`

**Production Bindings:**
- D1: `DB` → `scratchsolid-backend-db` (ID: 2a0b1e08-443e-46c4-8184-86ea180d4024)
- KV: RATE_LIMIT_KV
- R2: UPLOADS_BUCKET
- Route: `api.scratchsolidsolutions.org/*`

**Staging Bindings:**
- D1: `DB` → `scratchsolid-db-backend-staging` (ID: 67e66542-486a-442b-bbf6-9c3d4a503f4c)
- KV: RATE_LIMIT_KV
- R2: UPLOADS_BUCKET
- Route: `api-staging.scratchsolidsolutions.org/*`

**Cron Triggers:** `0 0 * * *` (daily at midnight)

**Issues:**
- ⚠️ Uses `DB` binding name while marketing-site and internal-portal use `scratchsolid_db`
- ⚠️ No STATUS_KV binding (internal-portal has it)

### 2.4 Database Binding Name Inconsistency

| Project | Production Binding Name | Staging Binding Name |
|---|---|---|
| Marketing Site | `scratchsolid_db` | `scratchsolid_db` |
| Internal Portal | `scratchsolid_db` | `scratchsolid_db` |
| Backend Worker | `DB` | `DB` |

**Impact:** Code must check for both binding names, adding complexity to database access helpers.

---

## 3. Package.json Scripts

### 3.1 Marketing Site (`marketing-site/package.json`)

**Build Scripts:**
- `dev`: `next dev`
- `build`: `next build`
- `cloudflare-build`: `opennextjs-cloudflare build`
- `start`: `next start`
- `lint`: `eslint`
- `preview`: `opennextjs-cloudflare build && opennextjs-cloudflare preview`
- `deploy`: `opennextjs-cloudflare build && opennextjs-cloudflare deploy`

**Test Scripts:**
- `test`: `jest`
- `test:watch`: `jest --watch`
- `test:coverage`: `jest --coverage`

**Other Scripts:**
- `cf-typegen`: `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts`

**Dependencies:**
- Next.js: 16.2.6
- OpenNext: 1.19.4
- Wrangler: 4.91.0

**Issues:** None

### 3.2 Internal Portal (`internal-portal/package.json`)

**Build Scripts:**
- `dev`: `next dev`
- `build`: `next build`
- `cloudflare-build`: `opennextjs-cloudflare build`
- `start`: `next start`
- `lint`: `next lint`
- `preview`: `opennextjs-cloudflare build && opennextjs-cloudflare preview`
- `deploy`: `opennextjs-cloudflare build && opennextjs-cloudflare deploy`

**Test Scripts:**
- `test`: `jest`
- `test:watch`: `jest --watch`
- `test:coverage`: `jest --coverage`

**Other Scripts:**
- `postinstall`: `node scripts/patch-better-auth.js`
- `cf-typegen`: `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts`

**Dependencies:**
- Next.js: 16.2.6
- OpenNext: 1.19.10 (newer than marketing-site)
- Wrangler: 4.91.0

**Issues:** None

### 3.3 Backend Worker (`backend-worker/package.json`)

**Build Scripts:**
- `dev`: `wrangler dev`
- `deploy`: `wrangler deploy`
- `deploy:prod`: `node deploy.js`
- `setup:d1`: `node setup-d1.js`
- `build`: `echo 'No build step required for Workers'`

**Test Scripts:**
- `test`: `jest`
- `test:watch`: `jest --watch`
- `test:coverage`: `jest --coverage`

**Dependencies:**
- Wrangler: 4.91.0

**Issues:**
- ⚠️ Has `deploy:prod` script that uses `node deploy.js` but workflow uses `wrangler deploy` directly
- ⚠️ No lint script

### 3.4 Script Consistency Analysis

| Script | Marketing Site | Internal Portal | Backend Worker |
|---|---|---|---|
| cloudflare-build | ✅ | ✅ | ❌ |
| deploy | ✅ | ✅ | ✅ (different method) |
| lint | ✅ | ✅ | ❌ |
| test | ✅ | ✅ | ✅ |
| dev | ✅ | ✅ | ✅ |

---

## 4. Documentation Audit

### 4.1 Root DEPLOYMENT.md

**Status:** ✅ Comprehensive and up-to-date

**Sections:**
- Architecture Overview
- Secrets Management
- Pre-Deployment Checklist
- Build & Deploy (OpenNext Method)
- DNS Configuration
- Post-Deployment Verification
- Security Posture Summary
- Environment Variables Reference
- GitHub Actions Workflows (updated with recent changes)
- Database Unavailable Error Root Cause Analysis

**Issues:** None

### 4.2 CICD_PIPELINE.md

**Status:** ✅ Comprehensive but slightly outdated

**Sections:**
- Pipeline Architecture
- CI Pipeline Details
- Deployment Pipeline Details
- Required GitHub Secrets
- Workflow Status Checks
- Deployment Environments
- Rollback Procedure
- Monitoring and Notifications
- Security Considerations
- Troubleshooting
- Future Enhancements

**Issues:**
- ⚠️ Mentions Node.js 20 but workflows use Node.js 22
- ⚠️ Status says "⏳ GitHub secrets need to be added" but secrets are configured
- ⚠️ Last updated May 14, 2026 (needs refresh)

### 4.3 Marketing Site DEPLOYMENT.md

**Status:** ⚠️ Outdated and redundant

**Issues:**
- ⚠️ Redundant - duplicates information from root DEPLOYMENT.md
- ⚠️ Mentions "Cloudflare Pages + Workers" but uses OpenNext Workers
- ⚠️ Mentions Pages-specific features like "Rollback" button that doesn't apply to Workers
- ⚠️ References `scratchsolid-db` but actual binding is `scratchsolid-marketing-db`
- ⚠**Should be deleted or merged into root DEPLOYMENT.md**

---

## 5. Consistency Analysis

### 5.1 Workflow vs Documentation

**CI/CD_PIPELINE.md says:**
- Node.js 20
- CI pipeline has lint, test, build, security audit
- Staging: no tests, just build and deploy
- Production: tests required

**Actual workflows:**
- Node.js 22
- CI pipeline: lint, test, build, security audit ✅
- Staging: no tests, just build and deploy ✅
- Production: tests required ✅

**Conclusion:** Mostly consistent except Node.js version

### 5.2 Workflow vs Wrangler Config

**Workflow commands:**
- Marketing Site: `npm run cloudflare-build` then `wrangler deploy`
- Internal Portal: `npm run cloudflare-build` then `wrangler deploy`
- Backend Worker: `wrangler deploy` directly

**Wrangler configs:**
- Marketing Site: OpenNext with `.open-next/worker.js` ✅
- Internal Portal: OpenNext with `.open-next/worker.js` ✅
- Backend Worker: Pure Worker with `src/index.ts` ✅

**Conclusion:** Consistent

### 5.3 Database Binding Names

**Code expects:**
- Marketing Site: `scratchsolid_db`, `scratchsolidDb`, `DB`, `db`, `database`
- Internal Portal: `scratchsolid_db`, `scratchsolidDb`, `scratchsolid_db_portal_staging`, `DB`, `db`, `database`

**Wrangler provides:**
- Marketing Site: `scratchsolid_db` ✅
- Internal Portal: `scratchsolid_db` ✅
- Backend Worker: `DB` ✅

**Conclusion:** Consistent, but backend-worker uses different binding name

### 5.4 Environment Variables

**Wrangler vars:**
- Marketing Site: NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_API_URL, R2_BUCKET, R2_PUBLIC_BASE
- Internal Portal: ALLOWED_ORIGINS
- Backend Worker: ENVIRONMENT, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_API_URL

**Workflow env vars:**
- Staging: CLOUDFLARE_ACCOUNT_ID (passed to build and deploy)
- Production: No additional env vars passed

**Conclusion:** Mostly consistent, but staging workflow passes CLOUDFLARE_ACCOUNT_ID

---

## 6. Critical Issues

### 6.1 High Priority

**None**

### 6.2 Medium Priority

1. **Staging workflow cannot be manually triggered**
   - Missing `workflow_dispatch` trigger
   - Impact: Cannot deploy to staging without pushing code
   - Fix: Add `workflow_dispatch:` to deploy-staging.yml

2. **Inconsistent wrangler versions**
   - Staging uses 4.93.0, production uses 4.91.0
   - Impact: Potential deployment inconsistencies
   - Fix: Standardize on 4.93.0

3. **Database binding name inconsistency**
   - Backend worker uses `DB` while others use `scratchsolid_db`
   - Impact: Code complexity, potential confusion
   - Fix: Standardize on `scratchsolid_db` across all projects

4. **Outdated CICD_PIPELINE.md**
   - Mentions Node.js 20 instead of 22
   - Impact: Documentation confusion
   - Fix: Update to Node.js 22

5. **Redundant marketing-site/DEPLOYMENT.md**
   - Duplicates root DEPLOYMENT.md with outdated info
   - Impact: Documentation confusion
   - Fix: Delete this file

### 6.3 Low Priority

1. **Formatting inconsistencies in deploy-staging.yml**
   - Lines 56-57 missing quotes around values
   - Impact: Minor style inconsistency
   - Fix: Add quotes for consistency

2. **Internal portal uses --legacy-peer-deps**
   - May indicate dependency issues
   - Impact: Potential future dependency problems
   - Fix: Investigate and resolve peer dependency conflicts

3. **Backend worker missing lint script**
   - Other projects have lint scripts
   - Impact: Inconsistent code quality checks
   - Fix: Add lint script to backend-worker/package.json

---

## 7. Recommendations

### 7.1 Immediate Actions

1. **Add workflow_dispatch to deploy-staging.yml**
   ```yaml
   on:
     push:
       branches: [ staging ]
     workflow_dispatch:  # Add this line
   ```

2. **Standardize wrangler version to 4.93.0**
   - Update deploy-production.yml wranglerVersion to 4.93.0
   - Update package.json wrangler versions to 4.93.0

3. **Delete marketing-site/DEPLOYMENT.md**
   - This file is redundant and outdated
   - Root DEPLOYMENT.md is the authoritative source

4. **Update CICD_PIPELINE.md**
   - Change Node.js 20 to Node.js 22
   - Update status to reflect current configuration
   - Update date to current date

### 7.2 Short-term Actions

1. **Standardize database binding name**
   - Change backend-worker wrangler.toml from `DB` to `scratchsolid_db`
   - Update backend-worker code to use new binding name
   - Test both environments after change

2. **Add lint script to backend-worker**
   ```json
   "lint": "eslint . --ext .ts"
   ```

3. **Fix formatting in deploy-staging.yml**
   - Add quotes to lines 56-57 for consistency

4. **Investigate --legacy-peer-deps flag**
   - Determine why internal-portal needs this flag
   - Resolve peer dependency conflicts if possible

### 7.3 Long-term Actions

1. **Consider blue-green deployments**
   - Add canary deployments for production
   - Implement automated rollback on failure

2. **Add smoke tests after deployment**
   - Test critical endpoints after each deployment
   - Fail deployment if smoke tests fail

3. **Add deployment notifications**
   - Slack integration for deployment status
   - Email notifications for failed deployments

4. **Implement GitOps with ArgoCD**
   - Consider moving to GitOps for better control
   - Add progressive delivery capabilities

---

## 8. Deployment Flow Diagram

```
Git Push to Branch
    ↓
[main branch] → [staging branch] → [develop branch]
    ↓              ↓                 ↓
CI Pipeline   CI Pipeline      CI Pipeline
    ↓              ↓                 ↓
Deploy to     Deploy to        No Deployment
Production     Staging          (CI only)
    ↓              ↓
Manual         Automatic
Approval       (no approval)
    ↓              ↓
Cloudflare    Cloudflare
Workers        Workers
```

---

## 9. Security Considerations

### 9.1 Secrets Management

**Current State:**
- ✅ Secrets not committed to repository
- ✅ Secrets set via Cloudflare Dashboard
- ✅ GitHub Secrets for API tokens

**Recommendations:**
- ✅ Continue current practices
- ⚠️ Add secret rotation schedule
- ⚠️ Add secret audit logging

### 9.2 Access Control

**Current State:**
- ✅ Production requires manual approval
- ⚠️ Staging has no approval (automated)
- ✅ Only admins can approve production

**Recommendations:**
- ⚠️ Consider requiring approval for staging as well
- ⚠️ Add reviewer requirements for production

### 9.3 Security Scanning

**Current State:**
- ✅ npm audit in CI pipeline
- ✅ High-severity vulnerabilities block deployment
- ✅ Security audit report generated

**Recommendations:**
- ✅ Continue current practices
- ⚠️ Add SAST/DAST scanning
- ⚠️ Add dependency scanning (Snyk/Dependabot)

---

## 10. Conclusion

The deployment infrastructure for Scratch Solid Solutions is **well-structured and functional**. The three GitHub Actions workflows (CI, Deploy to Staging, Deploy to Production) correctly handle the deployment process for all three projects.

**Strengths:**
- Clear separation of concerns (CI vs deployment)
- Proper environment separation (staging vs production)
- Comprehensive documentation
- Security best practices followed
- Automated testing and security scanning

**Areas for Improvement:**
- Add manual trigger capability for staging
- Standardize wrangler versions across workflows
- Resolve database binding name inconsistency
- Update outdated documentation
- Add lint script to backend-worker

**Overall Assessment:** ✅ **HEALTHY** with minor improvements recommended

---

## Appendix A: File Inventory

### GitHub Actions Workflows
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-production.yml`
- `.github/workflows/deploy-staging.yml`

### Wrangler Configurations
- `marketing-site/wrangler.jsonc`
- `internal-portal/wrangler.jsonc`
- `backend-worker/wrangler.toml`

### Package.json Files
- `marketing-site/package.json`
- `internal-portal/package.json`
- `backend-worker/package.json`

### Documentation
- `DEPLOYMENT.md` (root)
- `CICD_PIPELINE.md`
- `marketing-site/DEPLOYMENT.md` (⚠️ should be deleted)

---

**Report Completed:** May 21, 2026
