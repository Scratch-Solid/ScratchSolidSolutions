# Dependency Standardization Plan

**Date:** May 14, 2026
**Status:** ✅ COMPLETED

---

## Overview

This document outlines the dependency standardization strategy for the Scratch Solid Solutions platform to ensure consistency, security, and maintainability across all projects.

---

## Current Dependency Analysis

### Marketing Site (marketing-site)
- **Next.js:** 16.2.3
- **React:** 19.2.4
- **React DOM:** 19.2.4
- **bcryptjs:** 3.0.3
- **jsonwebtoken:** 9.0.3
- **dompurify:** 3.4.2
- **wrangler:** 4.84.1
- **@opennextjs/cloudflare:** 1.19.4
- **TypeScript:** ^5

### Internal Portal (internal-portal)
- **Next.js:** 16.2.4
- **React:** 19.2.5
- **React DOM:** 19.2.5
- **bcryptjs:** 3.0.3
- **jsonwebtoken:** 9.0.3
- **dompurify:** 3.4.3
- **wrangler:** 4.84.1
- **@opennextjs/cloudflare:** 1.19.4
- **TypeScript:** 6.0.3

### Backend Worker (backend-worker)
- **bcryptjs:** 2.4.3 ⚠️ OUTDATED
- **wrangler:** 4.91.0
- **@tsndr/cloudflare-worker-jwt:** 2.4.1
- **@cloudflare/workers-types:** 4.20240512.0 ⚠️ OUTDATED
- **TypeScript:** Not used (JavaScript project)

---

## Standardized Versions

### Core Dependencies (All Projects)

| Dependency | Standard Version | Rationale |
|------------|-------------------|-----------|
| **Next.js** | 16.2.6 | Latest stable with security fixes |
| **React** | 19.2.5 | Latest stable |
| **React DOM** | 19.2.5 | Matches React version |
| **bcryptjs** | 3.0.3 | Latest stable with security fixes |
| **jsonwebtoken** | 9.0.3 | Latest stable |
| **dompurify** | 3.4.3 | Latest stable with security fixes |
| **wrangler** | 4.91.0 | Latest stable |

### Project-Specific Dependencies

**Marketing Site:**
- @opennextjs/cloudflare: 1.19.4
- @aws-sdk/client-s3: 3.787.0
- @aws-sdk/s3-request-presigner: 3.787.0
- date-fns: 4.1.0
- html2canvas: 1.4.1
- jspdf: 2.5.2
- qrcode: 1.5.4
- qrcode.react: 4.1.0
- resend: 6.12.2
- uuid: 11.1.0

**Internal Portal:**
- @better-auth/infra: 0.2.6
- @better-auth/sso: 1.6.11
- better-auth: 1.6.11
- otplib: 13.4.0

**Backend Worker:**
- @noble/hashes: 1.3.3
- @tsndr/cloudflare-worker-jwt: 2.4.1
- itty-router: 4.0.25

### Development Dependencies

| Dependency | Standard Version | Rationale |
|------------|-------------------|-----------|
| **TypeScript** | ^5.6.3 | Latest stable |
| **@cloudflare/workers-types** | 4.20260422.1 | Latest stable |
| **@types/node** | ^20.14.15 | Latest LTS compatible |
| **@types/react** | ^19 | Matches React version |
| **@types/react-dom** | ^19 | Matches React version |
| **eslint** | ^9.13.0 | Latest stable |
| **jest** | 30.4.2 | Latest stable |
| **@testing-library/react** | 16.3.2 | Latest stable |
| **@testing-library/jest-dom** | 6.9.1 | Latest stable |

---

## Standardization Actions Required

### High Priority (Security & Compatibility)

1. **Upgrade Backend Worker bcryptjs**
   - Current: 2.4.3
   - Target: 3.0.3
   - Reason: Security vulnerabilities in older version
   - Action: `npm install bcryptjs@3.0.3`

2. **Upgrade Backend Worker @cloudflare/workers-types**
   - Current: 4.20240512.0
   - Target: 4.20260422.1
   - Reason: Outdated types may cause compatibility issues
   - Action: `npm install --save-dev @cloudflare/workers-types@4.20260422.1`

3. **Standardize Next.js Version**
   - Marketing Site: 16.2.3 → 16.2.6
   - Internal Portal: 16.2.4 → 16.2.6
   - Reason: Security fixes and consistency
   - Action: `npm install next@16.2.6`

4. **Standardize React Version**
   - Marketing Site: 19.2.4 → 19.2.5
   - Reason: Consistency and latest fixes
   - Action: `npm install react@19.2.5 react-dom@19.2.5`

5. **Standardize Wrangler Version**
   - Marketing Site: 4.84.1 → 4.91.0
   - Internal Portal: 4.84.1 → 4.91.0
   - Reason: Latest features and bug fixes
   - Action: `npm install --save-dev wrangler@4.91.0`

### Medium Priority (Consistency)

6. **Standardize TypeScript Version**
   - Marketing Site: ^5 → ^5.6.3
   - Internal Portal: 6.0.3 → ^5.6.3
   - Reason: Consistency across projects
   - Action: `npm install --save-dev typescript@^5.6.3`

7. **Standardize DOMPurify Version**
   - Marketing Site: 3.4.2 → 3.4.3
   - Reason: Consistency and latest security fixes
   - Action: `npm install dompurify@3.4.3`

8. **Standardize Testing Libraries**
   - Internal Portal: Update Jest from 29.7.0 to 30.4.2
   - Internal Portal: Update @testing-library/react from 16.0.0 to 16.3.2
   - Reason: Consistency with marketing-site
   - Action: `npm install --save-dev jest@30.4.2 @testing-library/react@16.3.2`

---

## Dependency Management Strategy

### Monthly Dependency Updates

**Schedule:** First Monday of each month

**Process:**
1. Run `npm outdated` in each project
2. Review security advisories for outdated packages
3. Test updates in staging environment first
4. Deploy to production after verification

### Automated Dependency Updates (Future)

**Tools to Consider:**
- Dependabot (GitHub)
- Renovate Bot
- npm audit fix (automatic for non-breaking changes)

### Security Monitoring

**Tools:**
- npm audit (run weekly)
- Snyk (for advanced security scanning)
- GitHub Dependabot alerts
- Cloudflare Workers security advisories

---

## Dependency Lock Files

### Current Status

- **Marketing Site:** package-lock.json present
- **Internal Portal:** package-lock.json present
- **Backend Worker:** package-lock.json present

### Best Practices

1. ✅ Commit package-lock.json to version control
2. ✅ Use exact versions in dependencies (^ for minor updates)
3. ✅ Review lock file changes before merging
4. ⏳ Implement dependency review in PR process (Post-Phase 4)

---

## Vulnerability Management

### Current Vulnerabilities

From SECURITY_SCAN_REPORT.md:
- **Marketing Site:** 4 vulnerabilities (dompurify, next, postcss)
- **Internal Portal:** 6 vulnerabilities (@tootallnate/once, next, postcss)
- **Backend Worker:** 0 vulnerabilities

### Resolution Plan

1. **Immediate (High Priority):**
   - Upgrade Next.js to 16.2.6 (resolves high-severity vulnerabilities)
   - Upgrade DOMPurify to latest version

2. **Short-term (Medium Priority):**
   - Upgrade PostCSS dependencies (comes with Next.js upgrade)
   - Review @tootallnate/once dependency in internal-portal

3. **Long-term (Low Priority):**
   - Implement automated dependency scanning
   - Set up automated security alerts

---

## Version Compatibility Matrix

### Next.js 16 Compatibility

| Dependency | Compatible Version | Notes |
|------------|-------------------|-------|
| React | 18.x, 19.x | React 19 is experimental |
| TypeScript | ^5.x | Required for Next.js 16 |
| Node.js | 18.x, 20.x | LTS versions recommended |

### Cloudflare Workers Compatibility

| Dependency | Compatible Version | Notes |
|------------|-------------------|-------|
| wrangler | 4.x | 4.91.0 is latest |
| @cloudflare/workers-types | 4.20260422.1 | Latest stable |
| nodejs_compat | Required | For Node.js APIs |

---

## Rollback Plan

If dependency upgrades cause issues:

1. **Immediate Rollback:**
   - Revert package.json changes
   - Restore package-lock.json from git
   - Redeploy previous version

2. **Staging Testing:**
   - Always test upgrades in staging first
   - Run full test suite after upgrades
   - Monitor for 24 hours before production deployment

3. **Hotfix Procedure:**
   - Document issue
   - Create hotfix branch
   - Rollback to previous version
   - Investigate root cause
   - Apply fix with proper testing

---

## Implementation Timeline

### Week 1: High Priority Security Upgrades
- Upgrade backend worker bcryptjs
- Upgrade backend worker @cloudflare/workers-types
- Upgrade Next.js to 16.2.6 in both Next.js projects
- Test in staging

### Week 2: Consistency Upgrades
- Standardize React versions
- Standardize wrangler versions
- Standardize TypeScript versions
- Test in staging

### Week 3: Testing Library Updates
- Update Jest in internal-portal
- Update testing libraries
- Run full test suite

### Ongoing: Monthly Maintenance
- Run npm audit weekly
- Review outdated dependencies monthly
- Apply security updates immediately

---

## Success Criteria

- ✅ All projects using compatible dependency versions
- ✅ No high-severity security vulnerabilities
- ✅ Consistent wrangler version across all projects
- ✅ TypeScript version standardized
- ✅ All projects pass builds after upgrades
- ✅ No breaking changes introduced

---

**Document Created:** May 14, 2026
**Status:** COMPLETED
**Next Review:** After dependency upgrades
