# CI/CD Pipeline Documentation

**Date:** May 14, 2026
**Status:** ✅ COMPLETED

---

## Overview

This document describes the CI/CD pipeline implementation for the Scratch Solid Solutions platform using GitHub Actions.

---

## Pipeline Architecture

### CI Pipeline (Continuous Integration)

**Trigger:** Push to main, staging, or develop branches; Pull requests to these branches

**Purpose:** Build, test, and validate code changes

**Workflow:** `.github/workflows/ci.yml`

**Jobs:**
1. Marketing Site - Build & Test
2. Internal Portal - Build & Test
3. Backend Worker - Build & Test

### Staging Deployment Pipeline

**Trigger:** Push to staging branch

**Purpose:** Deploy changes to staging environment for testing

**Workflow:** `.github/workflows/deploy-staging.yml`

**Jobs:**
1. Deploy Marketing Site to Staging
2. Deploy Internal Portal to Staging
3. Deploy Backend Worker to Staging

### Production Deployment Pipeline

**Trigger:** Push to main branch

**Purpose:** Deploy changes to production environment

**Workflow:** `.github/workflows/deploy-production.yml`

**Jobs:**
1. Deploy Marketing Site to Production
2. Deploy Internal Portal to Production
3. Deploy Backend Worker to Production

---

## CI Pipeline Details

### Marketing Site CI Job

**Steps:**
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (npm ci)
4. Run linter (npm run lint)
5. Run tests (npm test)
6. Build (npm run build)
7. Security audit (npm audit --audit-level=high)

### Internal Portal CI Job

**Steps:**
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (npm ci)
4. Run linter (npm run lint)
5. Run tests (npm test)
6. Build (npm run build)
7. Security audit (npm audit --audit-level=high)

### Backend Worker CI Job

**Steps:**
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (npm ci)
4. Run tests (npm test)
5. Security audit (npm audit --audit-level=high)

---

## Deployment Pipeline Details

### Staging Deployment

**Environment:** staging
**Required Approval:** None (automated)
**Prerequisites:**
- All CI checks must pass
- Branch must be up to date

**Marketing Site Staging:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Build (npm run cloudflare-build)
5. Deploy to Cloudflare Workers (staging environment)

**Internal Portal Staging:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Build (npm run cloudflare-build)
5. Deploy to Cloudflare Workers (staging environment)

**Backend Worker Staging:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Deploy to Cloudflare Workers (staging environment)

### Production Deployment

**Environment:** production
**Required Approval:** Manual approval via GitHub environments
**Prerequisites:**
- All CI checks must pass
- Tests must pass
- Manual approval required

**Marketing Site Production:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run tests
5. Build (npm run cloudflare-build)
6. Deploy to Cloudflare Workers (production environment)

**Internal Portal Production:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run tests
5. Build (npm run cloudflare-build)
6. Deploy to Cloudflare Workers (production environment)

**Backend Worker Production:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run tests
5. Deploy to Cloudflare Workers (production environment)

---

## Required GitHub Secrets

### Cloudflare API Token

**Secret Name:** `CLOUDFLARE_API_TOKEN`
**Purpose:** Authenticate with Cloudflare Workers for deployment
**How to Generate:**
1. Go to Cloudflare dashboard
2. Navigate to My Profile > API Tokens
3. Create token with "Edit Cloudflare Workers" permission
4. Add token to GitHub repository secrets

### Additional Secrets (Future)

- `RESEND_API_KEY` - For email notifications
- `SLACK_WEBHOOK_URL` - For deployment notifications
- `SENTRY_DSN` - For error tracking

---

## Workflow Status Checks

### Required Checks for Merging

**To Staging:**
- Marketing Site CI passes
- Internal Portal CI passes
- Backend Worker CI passes

**To Production:**
- Marketing Site CI passes
- Internal Portal CI passes
- Backend Worker CI passes
- Manual approval (GitHub environment protection)

---

## Deployment Environments

### Staging Environment

**URLs:**
- Marketing Site: https://staging.scratchsolidsolutions.org
- Internal Portal: https://portal-staging.scratchsolidsolutions.org
- Backend Worker: https://cleaning-service-backend-staging.sparkling-darkness-405f.workers.dev

**Purpose:**
- Pre-production testing
- Feature validation
- Integration testing
- Performance testing

### Production Environment

**URLs:**
- Marketing Site: https://scratchsolidsolutions.org
- Internal Portal: https://portal.scratchsolidsolutions.org
- Backend Worker: https://api.scratchsolidsolutions.org

**Purpose:**
- Live production environment
- Customer-facing services
- Production data

---

## Rollback Procedure

### Automatic Rollback

If deployment fails:
- GitHub Actions will fail the job
- No changes are deployed
- Previous version remains active

### Manual Rollback

1. Identify problematic commit
2. Revert commit or merge previous stable state
3. Push to main branch
4. CI pipeline will automatically deploy rollback

### Emergency Rollback

1. Use Cloudflare dashboard to rollback
2. Use Wrangler CLI to rollback:
   ```bash
   npx wrangler rollback
   ```
3. Document incident

---

## Monitoring and Notifications

### Workflow Status

**GitHub Actions Dashboard:**
- View workflow runs
- Check job status
- View logs
- Monitor deployment status

**Notifications (Future):**
- Slack integration for deployment notifications
- Email notifications for failed deployments
- PagerDuty integration for production failures

### Deployment Metrics

**Metrics to Track:**
- Deployment frequency
- Deployment success rate
- Average deployment time
- Rollback frequency
- Failed deployment reasons

---

## Security Considerations

### Secrets Management

**Best Practices:**
- Never commit secrets to repository
- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Limit secret access to necessary workflows
- Use environment-specific secrets

### Access Control

**GitHub Environments:**
- Production environment requires manual approval
- Staging environment is automated
- Only administrators can approve production deployments

### Security Scanning

**Automated Scans:**
- npm audit in CI pipeline
- High-severity vulnerabilities block deployment
- Security audit report generated on each run

---

## Troubleshooting

### Common Issues

**Build Failures:**
- Check logs in GitHub Actions
- Verify dependencies are up to date
- Check for TypeScript errors
- Verify linting issues

**Deployment Failures:**
- Verify Cloudflare API token is valid
- Check wrangler configuration
- Verify environment variables are set
- Check Cloudflare service status

**Test Failures:**
- Run tests locally to reproduce
- Check test configuration
- Verify test dependencies
- Check for environment-specific issues

---

## Future Enhancements

### Planned Improvements

**Short-term:**
- Add Slack notifications
- Add deployment status badges
- Implement database migrations in CI/CD
- Add smoke tests after deployment

**Medium-term:**
- Add blue-green deployments
- Implement canary deployments
- Add automated rollback on failure
- Add performance regression tests

**Long-term:**
- Implement GitOps with ArgoCD
- Add chaos engineering tests
- Implement progressive delivery
- Add A/B testing infrastructure

---

## Workflow Configuration Files

### Files Created

- `.github/workflows/ci.yml` - CI pipeline
- `.github/workflows/deploy-staging.yml` - Staging deployment
- `.github/workflows/deploy-production.yml` - Production deployment

### Workflow Status

- ✅ CI pipeline configured
- ✅ Staging deployment configured
- ✅ Production deployment configured
- ⏳ GitHub secrets need to be added
- ⏳ Manual approval for production needs to be configured

---

## Documentation

**Related Documents:**
- GIT_PROTECTION_STRATEGY.md - Git workflow and protections
- DEPENDENCY_STANDARDIZATION.md - Dependency management
- SECURITY_AUDIT.md - Security considerations

---

**Document Created:** May 14, 2026
**Status:** COMPLETED
**Next Steps:** Add GitHub secrets, configure manual approval for production
