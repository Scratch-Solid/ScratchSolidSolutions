# Git-Based Protections Strategy

**Date:** May 14, 2026
**Status:** ✅ COMPLETED

---

## Overview

This document outlines the Git-based protection strategy for the Scratch Solid Solutions platform to ensure code quality, prevent unauthorized changes, and maintain a stable production environment.

---

## Branch Protection Rules

### Protected Branches

**Production Branch:** `main`
**Staging Branch:** `staging`

### Branch Protection Settings

#### Main Branch Protection

**Restrictions:**
- ✅ Require pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ⏳ Restrict who can push: Administrators only
- ⏳ Require conversation resolution before merging

**Required Approvals:**
- Minimum 1 approval from code reviewer
- Dismiss stale PR approvals when new commits are pushed
- Require review from CODEOWNERS

**Required Status Checks:**
- Build and test passes
- Lint checks pass
- Type checking passes
- Security scan passes (npm audit)

**Branch Restrictions:**
- Only administrators can push directly to main
- All changes must go through pull requests

#### Staging Branch Protection

**Restrictions:**
- ✅ Require pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
- ⏳ Restrict who can push: Administrators and developers
- ⏳ Allow force pushes: Disabled

**Required Approvals:**
- Minimum 1 approval from code reviewer
- Dismiss stale PR approvals when new commits are pushed

**Required Status Checks:**
- Build and test passes
- Lint checks pass
- Type checking passes

---

## Pull Request Requirements

### PR Template

**Location:** `.github/PULL_REQUEST_TEMPLATE.md`
**Status:** ✅ Created

**Required Fields:**
- Description of changes
- Type of change (bug fix, feature, breaking change, etc.)
- Related issue number
- Testing performed
- Checklist of requirements

### PR Review Process

**Review Requirements:**
1. At least one approval required
2. All status checks must pass
3. No unresolved conversations
4. Branch must be up to date with target branch

**Review Categories:**
- Code Review: Logic, architecture, best practices
- Security Review: Security implications, vulnerabilities
- Performance Review: Performance impact, optimizations
- Accessibility Review: WCAG compliance, keyboard navigation

**Review Roles:**
- **Code Reviewer:** Any developer with write access
- **Security Reviewer:** Designated security team member
- **Approver:** Project maintainer or lead developer

### Automated Checks

**Required Checks:**
- Build passes
- Tests pass
- Lint passes
- Type checking passes
- No high-severity security vulnerabilities

**Optional Checks:**
- Accessibility tests pass
- Performance benchmarks met
- Code coverage threshold met

---

## Workflow Strategy

### Branch Naming Convention

**Feature Branches:** `feature/description`
- Example: `feature/user-authentication`

**Bug Fix Branches:** `bugfix/description`
- Example: `bugfix/login-error`

**Hotfix Branches:** `hotfix/description`
- Example: `hotfix/security-vulnerability`

**Release Branches:** `release/version`
- Example: `release/v1.0.0`

**Chore Branches:** `chore/description`
- Example: `chore/update-dependencies`

### Git Workflow

**Feature Development:**
1. Create branch from `staging`
2. Implement feature
3. Run tests locally
4. Create PR to `staging`
5. Get approval and pass checks
6. Merge to `staging`
7. Test in staging environment
8. Create PR from `staging` to `main`
9. Get approval and pass checks
10. Merge to `main`
11. Deploy to production

**Hotfix Workflow:**
1. Create branch from `main`
2. Implement fix
3. Run tests locally
4. Create PR to `main`
5. Get expedited approval and pass checks
6. Merge to `main`
7. Deploy to production immediately
8. Backport to `staging`

---

## CODEOWNERS

### CODEOWNERS File

**Location:** `.github/CODEOWNERS`

**Rules:**
```
# Default code owner for all files
* @jason

# Backend worker specific
backend-worker/* @jason

# Marketing site specific
marketing-site/* @jason

# Internal portal specific
internal-portal/* @jason

# Security sensitive files
*secrets* @jason
*wrangler* @jason
```

---

## Commit Guidelines

### Commit Message Format

**Conventional Commits:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `security`: Security fixes

**Examples:**
```
feat(auth): add 2FA support for admin users

Implement Time-based One-Time Password (TOTP) authentication
for admin accounts using otplib library.

Closes #123
```

```
fix(api): resolve race condition in booking creation

Add database transaction to prevent double booking when
multiple requests arrive simultaneously.

Fixes #456
```

### Commit Hooks

**Pre-commit Hooks (to be implemented):**
- Lint staged files
- Type checking
- Run tests for changed files
- Check commit message format

**Pre-push Hooks (to be implemented):**
- Run full test suite
- Security scan (npm audit)
- Check for uncommitted changes

---

## Security Considerations

### Secret Management

**Prohibited:**
- Never commit secrets to repository
- Never commit API keys
- Never commit private keys
- Never commit passwords

**Required:**
- Use environment variables for secrets
- Use Wrangler secret put for Cloudflare Workers
- Use .env.example files for documentation
- Add secrets to .gitignore

### Sensitive Files

**Protected Files (require special approval):**
- `wrangler.toml` / `wrangler.jsonc`
- Migration files
- Schema files
- Security configuration files

---

## Emergency Procedures

### Emergency Bypass

**When to Bypass:**
- Critical security vulnerability
- Production outage
- Data loss incident
- Legal compliance requirement

**Bypass Process:**
1. Get approval from project owner
2. Document reason for bypass
3. Create hotfix branch
4. Merge with bypass approval
5. Deploy immediately
6. Create incident report
7. Review and improve procedures

### Rollback Procedure

1. Identify problematic commit
2. Revert commit or merge previous stable state
3. Deploy rollback
4. Monitor for issues
5. Document incident

---

## Monitoring and Enforcement

### Compliance Monitoring

**Tools:**
- GitHub branch protection rules
- GitHub status checks
- CODEOWNERS enforcement
- Automated PR checks

**Metrics to Track:**
- PR approval time
- Time to merge
- Failed builds
- Reverted commits
- Bypass incidents

### Enforcement

**Violations:**
- Direct pushes to protected branches
- Merging without approval
- Merging with failing checks
- Committing secrets

**Actions:**
- Block the action via GitHub settings
- Notify violator
- Document incident
- Provide training if needed

---

## Documentation Requirements

### PR Documentation

**Required:**
- Clear description of changes
- Related issue references
- Testing performed
- Breaking changes noted
- Migration steps if needed

### Code Documentation

**Required:**
- Complex functions documented
- APIs documented
- Configuration documented
- Security decisions documented

---

## Training and Onboarding

### Developer Training

**Topics:**
- Git workflow and branch strategy
- PR process and requirements
- Code review guidelines
- Commit message format
- Security best practices

### Resources

- Git workflow documentation
- PR template
- Commit message guidelines
- Security guidelines

---

## Review and Updates

### Regular Review

**Quarterly:**
- Review branch protection rules
- Update CODEOWNERS
- Review workflow efficiency
- Update documentation

**Annual:**
- Full Git strategy review
- Security audit of Git practices
- Tool evaluation
- Process improvements

---

## Implementation Status

### Completed
- ✅ PR template created
- ✅ Branch protection strategy documented
- ✅ Workflow strategy documented
- ✅ Commit guidelines documented

### Pending (GitHub Configuration)
- ⏳ Configure branch protection rules in GitHub
- ⏳ Create CODEOWNERS file
- ⏳ Set up required status checks
- ⏳ Configure approvers
- ⏳ Enable branch restrictions

### Pending (Local Setup)
- ⏳ Install pre-commit hooks (Phase Post-5)
- ⏳ Install pre-push hooks (Phase Post-5)
- ⏳ Set up commit message linting

---

## Contact

**Git Strategy Questions:** engineering@scratchsolidsolutions.org
**Emergency Bypass Requests:** jason (project owner)

---

**Document Created:** May 14, 2026
**Status:** COMPLETED
**Next Steps:** Configure GitHub settings and implement hooks
