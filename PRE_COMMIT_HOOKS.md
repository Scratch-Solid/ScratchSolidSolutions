# Pre-commit Hooks Configuration

**Date:** May 14, 2026
**Status:** ✅ COMPLETED

---

## Overview

This document outlines the pre-commit hooks configuration for the Scratch Solid Solutions platform to ensure code quality, prevent common errors, and maintain consistent code style across all projects.

---

## Tool Selection

### Husky

**Purpose:** Git hooks management
**Version:** ^9.1.0
**Installation:** `npm install --save-dev husky`

**Why Husky:**
- Native Git hooks support
- Easy configuration
- Works with any package manager
- Cross-platform compatibility

### lint-staged

**Purpose:** Run linters on staged files only
**Version:** ^15.2.0
**Installation:** `npm install --save-dev lint-staged`

**Why lint-staged:**
- Only lints changed files
- Faster than linting entire project
- Prevents committing lint errors
- Configurable per file type

---

## Hook Configuration

### Pre-commit Hook

**Purpose:** Validate code before commit

**Checks:**
- Lint staged files
- Type check TypeScript files
- Format code with Prettier (optional)
- Run tests for changed files (optional)

**Trigger:** `git commit`

### Commit-msg Hook

**Purpose:** Validate commit message format

**Checks:**
- Conventional commits format
- Minimum length
- No special characters

**Trigger:** `git commit -m "message"`

### Pre-push Hook

**Purpose:** Validate code before push

**Checks:**
- Run full test suite
- Security scan (npm audit)
- Check for uncommitted changes

**Trigger:** `git push`

---

## Project-Specific Configuration

### Marketing Site

**Location:** `marketing-site/`

**Dependencies:**
```json
{
  "devDependencies": {
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "eslint": "^9.13.0",
    "prettier": "^3.2.5"
  }
}
```

**lint-staged Configuration:**
```json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

**Husky Configuration:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### Internal Portal

**Location:** `internal-portal/`

**Dependencies:**
```json
{
  "devDependencies": {
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "eslint": "^9.13.0",
    "prettier": "^3.2.5"
  }
}
```

**lint-staged Configuration:**
```json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

**Husky Configuration:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### Backend Worker

**Location:** `backend-worker/`

**Dependencies:**
```json
{
  "devDependencies": {
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "eslint": "^9.13.0"
  }
}
```

**lint-staged Configuration:**
```json
{
  "*.js": [
    "eslint --fix"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

**Husky Configuration:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

---

## Commit Message Linting

### Commitlint

**Purpose:** Enforce conventional commits format

**Installation:**
```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

**Configuration:** `commitlint.config.js`
```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'security']
    ],
    'subject-case': [0]
  }
};
```

**Husky Hook:** `commit-msg`
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx commitlint --edit $1
```

---

## Type Checking

### TypeScript Type Checking

**Marketing Site & Internal Portal:**
```json
{
  "*.{ts,tsx}": [
    "tsc --noEmit"
  ]
}
```

**Backend Worker:**
- No type checking (JavaScript project)

---

## Installation Instructions

### Root Level Installation

**Step 1: Install Husky**
```bash
npm install --save-dev husky
npx husky init
```

**Step 2: Install lint-staged**
```bash
npm install --save-dev lint-staged
```

**Step 3: Install Prettier (optional)**
```bash
npm install --save-dev prettier
```

**Step 4: Install Commitlint (optional)**
```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

**Step 5: Create lint-staged configuration**
- Create `.lintstagedrc.json` in root
- Configure file patterns and commands

**Step 6: Create pre-commit hook**
```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

**Step 7: Create commit-msg hook (optional)**
```bash
npx husky add .husky/commit-msg "npx commitlint --edit $1"
```

### Project-Specific Installation

Repeat the above steps for each project directory:
- `marketing-site/`
- `internal-portal/`
- `backend-worker/`

---

## Prettier Configuration

### Root Configuration

**File:** `.prettierrc.json`
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid"
}
```

### Ignore Configuration

**File:** `.prettierignore`
```
node_modules
.next
.open-next
dist
build
coverage
*.min.js
*.min.css
package-lock.json
pnpm-lock.yaml
yarn.lock
```

---

## ESLint Configuration

### Marketing Site & Internal Portal

**File:** `.eslintrc.json`
```json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Backend Worker

**File:** `.eslintrc.json`
```json
{
  "env": {
    "node": true,
    "worker": true
  },
  "extends": ["eslint:recommended"],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

---

## Hook Performance

### Optimization Strategies

**Run on Staged Files Only:**
- lint-staged only processes changed files
- Faster than full project lint

**Parallel Execution:**
- lint-staged runs commands in parallel
- Reduces overall hook execution time

**Cache Results:**
- ESLint and Prettier support caching
- Reduces repeated work

### Expected Performance

**Small Changes (< 10 files):**
- Lint: < 5 seconds
- Type check: < 10 seconds
- Total: < 15 seconds

**Medium Changes (10-50 files):**
- Lint: < 15 seconds
- Type check: < 30 seconds
- Total: < 45 seconds

**Large Changes (> 50 files):**
- Lint: < 30 seconds
- Type check: < 60 seconds
- Total: < 90 seconds

---

## Troubleshooting

### Hook Not Running

**Check:**
1. Husky installed: `npm list husky`
2. Hooks executable: `chmod +x .husky/*`
3. Git hooks directory: `.git/hooks/`

**Fix:**
```bash
chmod +x .husky/*
npx husky install
```

### Lint Errors Blocking Commit

**Options:**
1. Fix the lint errors
2. Use `--no-verify` to skip hooks (not recommended)
3. Add exception for specific files

### Type Check Failures

**Check:**
1. TypeScript version compatibility
2. tsconfig.json configuration
3. Type definitions installed

**Fix:**
```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

---

## Bypassing Hooks

### Emergency Bypass

**Command:**
```bash
git commit --no-verify -m "message"
git push --no-verify
```

**When to Use:**
- Emergency hotfix
- CI/CD automated commits
- Documentation updates

**Warning:** Use sparingly and document reason

---

## Monitoring and Metrics

### Hook Success Rate

**Metrics to Track:**
- Pre-commit hook success rate
- Lint-staged execution time
- Type check success rate
- Hook bypass frequency

**Collection Method:**
- Git hooks can log to file
- CI/CD can track hook failures
- Manual review of bypass usage

---

## Best Practices

### Development Workflow

**Commit Workflow:**
1. Stage changes: `git add`
2. Pre-commit hooks run automatically
3. Fix any issues
4. Commit: `git commit`
5. Commit-msg hook validates message
6. Push: `git push`
7. Pre-push hooks run automatically

### Code Quality

**Benefits:**
- Catch errors before commit
- Consistent code style
- Prevent broken code commits
- Enforce commit message format

### Team Adoption

**Onboarding:**
- Document hook configuration
- Provide troubleshooting guide
- Explain bypass policy
- Train on commit message format

---

## Implementation Status

### Completed
- ✅ Pre-commit hooks strategy documented
- ✅ Tool selection documented
- ✅ Configuration examples provided
- ✅ Installation instructions provided

### Pending (Manual Setup Required)
- ⏳ Install Husky in all projects
- ⏳ Install lint-staged in all projects
- ⏳ Configure lint-staged for each project
- ⏳ Create pre-commit hooks
- ⏳ Create commit-msg hooks (optional)
- ⏳ Install Prettier (optional)
- ⏳ Configure Prettier
- ⏳ Install Commitlint (optional)

---

## Related Documentation

**Related Documents:**
- GIT_PROTECTION_STRATEGY.md - Git workflow and protections
- DEPENDENCY_STANDARDIZATION.md - Dependency management
- CICD_PIPELINE.md - CI/CD integration

---

**Document Created:** May 14, 2026
**Status:** COMPLETED
**Next Steps:** Manual installation of Husky and lint-staged in each project
