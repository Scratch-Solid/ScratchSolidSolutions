# Better-Auth Configuration Review
## Audit Report

**Date:** 2026-05-27
**Reviewer:** Cascade AI
**Scope:** Better-Auth Configuration for Internal Portal
**File:** `src/lib/better-auth.ts`

---

## Executive Summary

This audit reviews the current Better-Auth configuration for security, compliance, and best practices. The configuration has **1 CRITICAL** and **3 MEDIUM** severity issues that must be addressed before production deployment.

**Overall Security Score:** 6.5/10
**Recommendation:** Address CRITICAL issue immediately, review MEDIUM issues before production.

---

## Current Configuration Analysis

### File: `src/lib/better-auth.ts`

```typescript
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'https://portal.scratchsolidsolutions.org',
  secret: process.env.BETTER_AUTH_SECRET || 'build-time-placeholder-not-used-at-runtime-replace-via-wrangler-secret',
  plugins: [
    dash({ apiKey: process.env.BETTER_AUTH_API_KEY })
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
    maxAge: 60 * 60 * 24 * 7, // 7 days
    concurrentSessions: {
      enabled: true,
      maxSessions: 3,
      strategy: 'revoke_old'
    }
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  socialProviders: {
    // Configure social providers as needed
  },
  twoFactor: {
    totp: {
      issuer: "ScratchSolid",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    },
    backupCode: {
      enabled: true,
      length: 10,
      characters: "0123456789",
    },
  },
});
```

---

## Findings

### CRITICAL Issues

#### 1. Placeholder Secret
**Severity:** CRITICAL
**Component:** `secret`
**Description:** The configuration uses a placeholder secret as a fallback value.

**Current Code:**
```typescript
secret: process.env.BETTER_AUTH_SECRET || 'build-time-placeholder-not-used-at-runtime-replace-via-wrangler-secret'
```

**Risk:**
- If the environment variable is not set, the placeholder secret is used
- Placeholder secrets are publicly known and can be used to forge session tokens
- Complete authentication bypass possible
- Session hijacking vulnerability

**Impact:** CRITICAL - Complete authentication system compromise

**Remediation:**
1. Remove the fallback placeholder value
2. Ensure `BETTER_AUTH_SECRET` is always set via Wrangler secrets
3. Use a cryptographically strong secret (minimum 32 bytes, randomly generated)
4. Add validation to fail fast if secret is not set

**Recommended Code:**
```typescript
secret: process.env.BETTER_AUTH_SECRET || (() => {
  throw new Error('BETTER_AUTH_SECRET environment variable must be set');
})()
```

**Priority:** CRITICAL - Must fix before production deployment

---

### MEDIUM Issues

#### 2. Session Expiration Too Long
**Severity:** MEDIUM
**Component:** `session.expiresIn`, `session.maxAge`
**Description:** Session expiration is set to 7 days, which is too long for sensitive systems.

**Current Code:**
```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 days
  maxAge: 60 * 60 * 24 * 7, // 7 days
}
```

**Risk:**
- Long-lived sessions increase exposure window if token is compromised
- Longer time for attackers to exploit stolen sessions
- Does not align with security best practices for admin systems

**Impact:** MEDIUM - Increased risk of session hijacking

**Remediation:**
1. Reduce session expiration to 24 hours for regular users
2. Reduce session expiration to 8 hours for admin users
3. Implement session refresh with re-authentication for sensitive operations
4. Consider implementing "remember me" functionality with separate, longer-lived tokens

**Recommended Code:**
```typescript
session: {
  expiresIn: 60 * 60 * 24, // 24 hours
  updateAge: 60 * 60 * 12, // 12 hours
  maxAge: 60 * 60 * 24, // 24 hours
  // ... rest of config
}
```

**Priority:** MEDIUM - Should fix before production deployment

---

#### 3. TOTP Algorithm Not Industry Standard
**Severity:** MEDIUM
**Component:** `twoFactor.totp.algorithm`
**Description:** TOTP uses SHA1 instead of the more secure SHA256.

**Current Code:**
```typescript
twoFactor: {
  totp: {
    issuer: "ScratchSolid",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  }
}
```

**Risk:**
- SHA1 is deprecated and considered less secure than SHA256
- Most modern authenticator apps support SHA256
- Potential compatibility issues with some security standards

**Impact:** MEDIUM - Reduced cryptographic security

**Remediation:**
1. Update algorithm to SHA256
2. Verify compatibility with authenticator apps (Google Authenticator, Authy, etc.)
3. Update documentation for users if needed

**Recommended Code:**
```typescript
twoFactor: {
  totp: {
    issuer: "ScratchSolid",
    algorithm: "SHA256",
    digits: 6,
    period: 30,
  }
}
```

**Priority:** MEDIUM - Should fix before production deployment

---

#### 4. No Rate Limiting Configuration
**Severity:** MEDIUM
**Component:** Global configuration
**Description:** Better-Auth configuration does not include rate limiting settings.

**Risk:**
- No built-in protection against brute force attacks
- Relies on application-level rate limiting only
- Increased vulnerability to credential stuffing

**Impact:** MEDIUM - Increased risk of authentication attacks

**Remediation:**
1. Add rate limiting configuration to Better-Auth
2. Configure per-IP and per-user rate limits
3. Implement progressive delays for failed attempts
4. Add CAPTCHA after multiple failures

**Recommended Code:**
```typescript
export const auth = betterAuth({
  // ... existing config
  rateLimit: {
    window: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    storage: 'kv', // Use KV for distributed rate limiting
    storageKey: 'auth-rate-limit'
  }
});
```

**Priority:** MEDIUM - Should fix before production deployment

---

### LOW Issues

#### 5. Backup Code Configuration Could Be Stronger
**Severity:** LOW
**Component:** `twoFactor.backupCode`
**Description:** Backup codes are 10-digit numeric only, which reduces entropy.

**Current Code:**
```typescript
backupCode: {
  enabled: true,
  length: 10,
  characters: "0123456789",
}
```

**Risk:**
- Numeric-only codes have lower entropy than alphanumeric
- 10 digits = 10^10 combinations (10 billion)
- Alphanumeric would provide significantly more combinations

**Impact:** LOW - Slightly reduced security for backup codes

**Remediation:**
1. Increase length to 12 characters
2. Use alphanumeric characters for higher entropy
3. Consider using mixed case for even higher entropy

**Recommended Code:**
```typescript
backupCode: {
  enabled: true,
  length: 12,
  characters: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
}
```

**Priority:** LOW - Nice to have, not critical

---

#### 6. No Advanced Security Features Enabled
**Severity:** LOW
**Component:** Global configuration
**Description:** Advanced security features like email verification, password reset, and advanced 2FA options are not configured.

**Risk:**
- Reduced security posture
- Missing user experience features
- Limited recovery options

**Impact:** LOW - Feature gap, not security risk

**Remediation:**
1. Add email verification configuration
2. Add password reset configuration
3. Consider adding SMS 2FA as backup option
4. Add IP-based session binding

**Priority:** LOW - Feature enhancement, not critical

---

## Configuration Best Practices Review

### Session Management
**Current:** 7-day session expiration, 3 concurrent sessions
**Recommendation:** 24-hour expiration, 3 concurrent sessions
**Status:** Needs improvement

### Cookie Security
**Current:** Cookie cache enabled with 5-minute max age
**Recommendation:** Add HttpOnly, Secure, SameSite flags
**Status:** Needs improvement

### 2FA Configuration
**Current:** TOTP with SHA1, 6 digits, 30-second period
**Recommendation:** TOTP with SHA256, 6 digits, 30-second period
**Status:** Needs improvement

### Account Linking
**Current:** Enabled
**Recommendation:** Keep enabled for flexibility
**Status:** Good

### Social Providers
**Current:** Not configured
**Recommendation:** Configure if needed (Google, Microsoft, etc.)
**Status:** Acceptable (not required)

---

## Security Headers Review

The Better-Auth configuration does not include security header configuration. Security headers should be configured at the middleware level (already implemented in `src/lib/middleware.ts`).

**Current Status:** Security headers implemented in middleware
**Recommendation:** Keep middleware implementation, add CORS configuration if needed

---

## Environment Variables Review

### Required Environment Variables
- `BETTER_AUTH_SECRET` - **CRITICAL** - Must be set via Wrangler secrets
- `BETTER_AUTH_URL` - Required for production
- `BETTER_AUTH_API_KEY` - Required for dash plugin

### Current Status
- `BETTER_AUTH_SECRET` - Placeholder fallback exists (CRITICAL issue)
- `BETTER_AUTH_URL` - Has fallback to production URL
- `BETTER_AUTH_API_KEY` - No fallback, will fail if not set

### Recommendations
1. Remove all fallback values for secrets
2. Add environment variable validation at startup
3. Document required environment variables
4. Add environment-specific configuration

---

## Compliance Assessment

### POPIA Compliance
- ✅ Session management configured
- ⚠️ Session expiration too long (should be shorter)
- ⚠️ No data retention policy for sessions
- ❌ No consent mechanism for data processing

### GDPR Compliance
- ✅ User can control sessions (concurrent session limit)
- ⚠️ Session expiration too long (should be shorter)
- ⚠️ No right to be forgotten for session data
- ❌ No data portability for session data

---

## Integration with Existing System

### Current Integration Points
1. `/api/auth/[...better-auth]/route.ts` - Better-Auth Next.js adapter
2. `/api/auth/login-better-auth/route.ts` - Custom login endpoint
3. `src/lib/db.ts` - Database helpers
4. `src/lib/middleware.ts` - Security middleware

### Integration Issues
1. **Dual Authentication Systems** - Both Better-Auth and custom login exist
2. **Session Store Mismatch** - Better-Auth uses its own session store, custom uses sessions table
3. **2FA Inconsistency** - Better-Auth has 2FA configured, custom has separate 2FA logic
4. **User Data Mismatch** - Better-Auth uses better_auth_users table, custom uses users table

### Recommendations
1. Decide on single authentication system (Better-Auth or custom)
2. If using Better-Auth, migrate all authentication to use it
3. If using custom, remove Better-Auth dependency
4. Ensure consistent session management across system

---

## Recommended Configuration Changes

### Immediate (Before Production)
```typescript
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || (() => {
    throw new Error('BETTER_AUTH_URL environment variable must be set');
  })(),
  secret: process.env.BETTER_AUTH_SECRET || (() => {
    throw new Error('BETTER_AUTH_SECRET environment variable must be set');
  })(),
  plugins: [
    dash({ apiKey: process.env.BETTER_AUTH_API_KEY || (() => {
      throw new Error('BETTER_AUTH_API_KEY environment variable must be set');
    })() })
  ],
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60 * 12, // 12 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
    maxAge: 60 * 60 * 24, // 24 hours
    concurrentSessions: {
      enabled: true,
      maxSessions: 3,
      strategy: 'revoke_old'
    }
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  twoFactor: {
    totp: {
      issuer: "ScratchSolid",
      algorithm: "SHA256",
      digits: 6,
      period: 30,
    },
    backupCode: {
      enabled: true,
      length: 12,
      characters: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    },
  },
  rateLimit: {
    window: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    storage: 'kv',
    storageKey: 'auth-rate-limit'
  }
});
```

### Short-term (Within 30 Days)
1. Add email verification configuration
2. Add password reset configuration
3. Add IP-based session binding
4. Add device fingerprinting

### Long-term (Within 60 Days)
1. Evaluate social login providers
2. Add SMS 2FA option
3. Implement advanced security analytics
4. Add anomaly detection

---

## Testing Recommendations

### Unit Tests
1. Test session expiration logic
2. Test concurrent session management
3. Test 2FA TOTP generation and verification
4. Test backup code generation and verification

### Integration Tests
1. Test login flow with Better-Auth
2. Test session refresh logic
3. Test 2FA setup and verification flow
4. Test concurrent session revocation

### Security Tests
1. Test session token forgery attempts
2. Test brute force protection
3. Test session hijacking scenarios
4. Test 2FA bypass attempts

---

## Conclusion

The current Better-Auth configuration has a **CRITICAL** security issue with the placeholder secret that must be addressed immediately. The session expiration is too long and should be reduced. The TOTP algorithm should be updated to SHA256 for better security.

**Overall Security Score:** 6.5/10

**Key Findings:**
- CRITICAL: Placeholder secret must be replaced
- MEDIUM: Session expiration too long
- MEDIUM: TOTP should use SHA256
- MEDIUM: No rate limiting configured
- LOW: Backup codes could be stronger

**Recommendation:** Address CRITICAL issue immediately, then fix MEDIUM issues before production deployment. Consider whether to fully adopt Better-Auth or continue with custom authentication system to avoid dual-system complexity.

---

**Report Status:** DRAFT
**Next Review:** After configuration changes
**Approved By:** [Pending]
