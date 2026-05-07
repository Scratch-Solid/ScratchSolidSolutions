# Auth Flow Audit - Marketing Site

## Executive Summary
Comprehensive audit of individual and business signup/login flows with recommendations for world-class standards, compliance, and security.

---

## Current Issues Found

### 1. **Session Expiration Too Short** (Critical)
**Issue:** Sessions expire in 5 minutes
**Impact:** Users will be logged out constantly, poor UX
**Fix:** Increase to 7-30 days with refresh token mechanism
**Priority:** HIGH

### 2. **Inconsistent Token Expiration** (Critical)
**Issue:** Signup tokens expire in 7 days, login tokens in 24 hours
**Impact:** Inconsistent user experience
**Fix:** Standardize to 7-30 days with refresh tokens
**Priority:** HIGH

### 3. **No Email Verification** (Critical - Compliance)
**Issue:** New accounts are not verified via email
**Impact:** Invalid emails, compliance issues (POPIA/GDPR)
**Fix:** Require email verification before account activation
**Priority:** HIGH

### 4. **No Refresh Token Mechanism** (Critical - Security)
**Issue:** Only access tokens, no refresh tokens
**Impact:** Security risk, poor UX (forced re-login)
**Fix:** Implement refresh token rotation
**Priority:** HIGH

### 5. **Database Schema Not Applied** (Critical)
**Issue:** Schema may not be applied to production D1 database
**Impact:** Auth will fail completely
**Fix:** Run migrations: `npx wrangler d1 execute scratchsolid-db --remote --file=schema.sql`
**Priority:** CRITICAL

### 6. **Password Reset Not Tested** (Medium)
**Issue:** Forgot password flow exists but may not be tested end-to-end
**Impact:** Users unable to recover accounts
**Fix:** Test complete flow with production credentials
**Priority:** MEDIUM

### 7. **No 2FA/MFA** (Security)
**Issue:** No multi-factor authentication
**Impact:** Security risk for sensitive data
**Fix:** Add TOTP/SMS 2FA option
**Priority:** MEDIUM

### 8. **No CAPTCHA** (Security)
**Issue:** No CAPTCHA on signup/login
**Impact:** Vulnerable to automated attacks
**Fix:** Add Cloudflare Turnstile or reCAPTCHA
**Priority:** MEDIUM

### 9. **Rate Limiting Too Lenient** (Security)
**Issue:** 30 requests per minute per IP
**Impact:** Vulnerable to brute force attacks
**Fix:** Reduce to 5-10 requests per minute for auth endpoints
**Priority:** MEDIUM

### 10. **No Device Fingerprinting** (Security)
**Issue:** No device tracking for suspicious activity
**Impact:** Cannot detect account takeover attempts
**Fix:** Add device fingerprinting and anomaly detection
**Priority:** LOW

### 11. **No Audit Logging** (Security)
**Issue:** Failed login attempts not logged to audit table
**Impact:** Cannot detect attack patterns
**Fix:** Log all auth events to audit_logs table
**Priority:** LOW

### 12. **Password Requirements Too Strict** (UX)
**Issue:** Requires special character
**Impact:** User frustration, password reuse
**Fix:** Make special character optional, add password strength meter
**Priority**: LOW

### 13. **No Account Deletion** (Compliance)
**Issue:** Users cannot delete their accounts (GDPR right to erasure)
**Impact:** Compliance violation
**Fix:** Add account deletion with data retention policy
**Priority**: MEDIUM

### 14. **No Data Export** (Compliance)
**Issue:** Users cannot export their data (GDPR right to data portability)
**Impact:** Compliance violation
**Fix:** Add data export endpoint
**Priority**: MEDIUM

### 15. **No Consent Management** (Compliance)
**Issue:** Consent only captured at signup, no management UI
**Impact**: Compliance violation
**Fix**: Add consent management page
**Priority**: MEDIUM

### 16. **No Terms/Acceptance Tracking** (Compliance)
**Issue:** Terms acceptance not tracked in database
**Impact**: Legal risk
**Fix**: Track acceptance with timestamp and version
**Priority**: MEDIUM

---

## World-Class Standards Recommendations

### Security Standards (OWASP, NIST)

1. **Implement Refresh Token Rotation**
   - Short-lived access tokens (15-30 minutes)
   - Long-lived refresh tokens (7-30 days)
   - Refresh token rotation on each use
   - Refresh token invalidation on password change

2. **Add Multi-Factor Authentication (MFA)**
   - TOTP (Google Authenticator, Authy)
   - SMS-based 2FA for South Africa
   - Recovery codes for backup

3. **Implement CAPTCHA**
   - Cloudflare Turnstile (invisible, user-friendly)
   - reCAPTCHA v3 as fallback

4. **Enhanced Rate Limiting**
   - 5 requests per minute for auth endpoints
   - IP-based + email-based + phone-based limits
   - Exponential backoff for repeated failures

5. **Device Fingerprinting**
   - Track user agents, IP ranges, device IDs
   - Alert on new device login
   - Require additional verification for suspicious logins

6. **Audit Logging**
   - Log all auth events (success, failure, password reset)
   - Include IP, user agent, timestamp, location
   - Store in audit_logs table with retention policy

### Compliance Standards (POPIA, GDPR)

1. **Email Verification**
   - Require email verification before account activation
   - Send verification email with time-limited token
   - Resend verification option with rate limiting

2. **Consent Management**
   - Granular consent checkboxes (marketing, analytics, communications)
   - Consent versioning
   - Ability to withdraw consent
   - Consent history tracking

3. **Data Retention**
   - Define retention periods for different data types
   - Automated data deletion after retention period
   - Soft delete with hard delete after compliance period

4. **Data Export (GDPR Article 15)**
   - API endpoint to export all user data
   - JSON or CSV format
   - Include all personal data and consent history

5. **Account Deletion (GDPR Article 17)**
   - Self-service account deletion
   - Confirmation with email verification
   - Data anonymization or deletion
   - Retain minimal data for legal requirements

6. **Terms of Service Tracking**
   - Track acceptance with timestamp and version
   - Re-acceptance on policy changes
   - Version history

### UX Best Practices

1. **Password Management**
   - Password strength meter (real-time feedback)
   - Show/hide password toggle
   - Password complexity requirements clearly explained
   - Password reset via email AND SMS

2. **Session Management**
   - "Remember me" option (extend session to 30 days)
   - Active sessions management page
   - Remote logout from all devices
   - Session timeout warning (5 minutes before expiry)

3. **Onboarding Flow**
   - Progressive signup (collect minimal info first)
   - Email verification before profile completion
   - Welcome email with getting started guide
   - Product tour for new users

4. **Error Handling**
   - Clear, actionable error messages
   - Don't reveal whether email/phone exists (security)
   - Suggest common mistakes (typos, format issues)
   - Provide help links for common issues

---

## Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. Apply database schema to production
2. Fix session expiration (increase to 7 days)
3. Standardize token expiration
4. Add email verification
5. Implement refresh tokens

### Phase 2: Security Enhancements (1-2 weeks)
1. Add CAPTCHA
2. Tighten rate limiting
3. Add audit logging
4. Implement device fingerprinting
5. Add 2FA/MFA

### Phase 3: Compliance Features (2-4 weeks)
1. Add consent management
2. Add account deletion
3. Add data export
4. Track terms acceptance
5. Implement data retention policy

### Phase 4: UX Improvements (1-2 weeks)
1. Password strength meter
2. Show/hide password
3. "Remember me" option
4. Session management page
5. Progressive signup

---

## Testing Checklist

- [ ] Individual signup with phone
- [ ] Individual signup with email
- [ ] Business signup
- [ ] Individual login with phone
- [ ] Business login with email
- [ ] Password reset flow
- [ ] Email verification flow
- [ ] Account lockout (5 failed attempts)
- [ ] Session expiration
- [ ] Refresh token rotation
- [ ] Rate limiting
- [ ] CAPTCHA functionality
- [ ] 2FA setup and login
- [ ] Consent management
- [ ] Account deletion
- [ ] Data export

---

## Environment Variables Required

Add to Cloudflare Workers:
- `JWT_SECRET` (min 32 chars) ✓
- `REFRESH_TOKEN_SECRET` (min 32 chars) - NEW
- `RESEND_API_KEY` ✓
- `NEXT_PUBLIC_BASE_URL` ✓
- `NEXT_PUBLIC_API_URL` ✓
- `CLOUDFLARE_TURNSTILE_SECRET_KEY` - NEW

---

## Database Schema Updates Required

Add to schema.sql:
```sql
-- Email verification
CREATE TABLE IF NOT EXISTS email_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  verified_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Consent tracking
CREATE TABLE IF NOT EXISTS user_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  accepted_at TEXT DEFAULT (datetime('now')),
  withdrawn_at TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Terms acceptance tracking
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  terms_version TEXT NOT NULL,
  accepted_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```
