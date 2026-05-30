# Login Flow Issues Report
**Date:** May 30, 2026
**Scope:** End-to-end login and authentication flow review

---

## Critical Issues (Must Fix)

### 1. email_verified Check Without Initialization
**Location:** `src/app/api/auth/login/route.ts:96`
**Issue:** Login checks `email_verified` field but signup/register endpoints don't set it.
```typescript
if (!user.email_verified && user.role !== 'cleaner') {
  return createSecurityError('Please verify your email before logging in', 403);
}
```
**Impact:** Users created via signup/register will have `email_verified = NULL`, causing login failures for non-cleaner roles.
**Fix:** Set `email_verified = 1` in signup/register, or remove the check if email verification is not implemented.

---

### 2. password_needs_reset Not Checked in Login
**Location:** `src/app/api/auth/login/route.ts:104`
**Issue:** Login has `mustChangePassword` hardcoded to false, doesn't check the `password_needs_reset` column.
```typescript
const passwordChangeRequired = false; // TODO: Implement password age check
```
**Impact:** Password reset requirement is ignored even when `password_needs_reset = 1` in database.
**Fix:** Query and check `password_needs_reset` column from users table.

---

### 3. Sessions Table Not Initialized
**Location:** `src/lib/db.ts` (missing initialization)
**Issue:** Code uses sessions table extensively but there's no CREATE TABLE statement for it.
**Impact:** Session management will fail with "no such table" error.
**Fix:** Add `initializeSessionsTable` function with CREATE TABLE statement.

---

### 4. JWT_SECRET Fallback
**Location:** `src/lib/auth.ts:22`
**Issue:** JWT_SECRET has a fallback value which is insecure.
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
```
**Impact:** If JWT_SECRET is not set in production, weak fallback is used, compromising JWT security.
**Fix:** Remove fallback, throw error if JWT_SECRET is not set in production.

---

## High-Priority Issues

### 5. Inconsistent Bcrypt Rounds
**Locations:**
- `src/lib/auth.ts:159` - Uses 12 rounds
- `src/app/api/auth/signup/route.ts:60` - Uses 10 rounds
- `src/app/api/auth/register/route.ts:52` - Uses 10 rounds
- `src/app/api/auth/create-profile/route.ts:69` - Uses 10 rounds
**Issue:** Inconsistent bcrypt cost factor across the codebase.
**Impact:** Security inconsistency, potential performance issues.
**Fix:** Standardize on 12 rounds everywhere.

---

### 6. Inconsistent Bcrypt Prefix Replacement
**Locations:**
- `src/app/api/auth/create-profile/route.ts:69` - Replaces `$2b$` with `$2a$`
- `src/app/api/auth/change-password/route.ts:56` - Replaces `$2b$` with `$2a$`
- `src/app/api/auth/signup/route.ts:60` - Does NOT replace
- `src/app/api/auth/register/route.ts:52` - Does NOT replace
**Issue:** Some places replace bcrypt prefix as D1 workaround, some don't.
**Impact:** Password hashes may not be comparable if stored with different prefixes.
**Fix:** Either apply replacement consistently everywhere or remove it entirely if D1 now supports `$2b$`.

---

### 7. No Login Attempt Tracking
**Location:** `src/app/api/auth/login/route.ts`
**Issue:** `auth.ts` has functions for tracking failed login attempts (`recordFailedAttempt`, `isUserLockedOut`, `clearFailedAttempts`) but login route doesn't use them.
**Impact:** No brute force protection despite infrastructure being in place.
**Fix:** Integrate login attempt tracking in login route.

---

### 8. Password Normalization Inconsistency
**Location:** `src/app/api/auth/change-password/route.ts:44-48`
**Issue:** Change-password tries both raw and normalized (digits only) passwords, but login doesn't.
```typescript
const normalizedCurrentPassword = currentPassword.replace(/\D/g, '');
const normalizedMatch = await bcrypt.compare(normalizedCurrentPassword, passwordHash);
```
**Impact:** Users who created temp password with phone digits (pending-contracts) may not be able to login if they enter formatted phone number.
**Fix:** Add same normalization logic to login route.

---

### 9. signup Route Missing Fields
**Location:** `src/app/api/auth/signup/route.ts:65`
**Issue:** signup INSERT doesn't include `username`, `email_verified`, `password_needs_reset` columns.
```typescript
'INSERT INTO users (name, email, password_hash, role, phone, address, business_name, business_info, created_at)'
```
**Impact:** Users created via signup will have NULL values for these fields, potentially breaking login.
**Fix:** Add missing columns to INSERT statement.

---

### 10. CSRF Disabled on Login
**Location:** `src/app/api/auth/login/route.ts:27-29`
**Issue:** CSRF protection is commented out on login endpoint.
```typescript
// const csrfResult = await withCsrf(request);
// if (csrfResult) return csrfResult;
```
**Impact:** Login endpoint vulnerable to CSRF attacks.
**Fix:** Either enable CSRF or document why it's disabled (e.g., for initial authentication).

---

## Medium-Priority Issues

### 11. Rate Limiting In-Memory Only
**Location:** `src/lib/auth.ts:32`, `src/lib/middleware.ts:9`
**Issue:** Rate limiting uses Map, won't work across multiple Cloudflare Workers instances.
**Impact:** Rate limiting can be bypassed by distributing requests across instances.
**Fix:** Use KV-backed rate limiting (withKVRateLimit middleware exists but not used).

---

### 12. localStorage Token Storage
**Location:** Multiple frontend files (login/page.tsx, create-profile/page.tsx, etc.)
**Issue:** JWT tokens stored in localStorage, vulnerable to XSS.
**Impact:** If XSS vulnerability exists, attacker can steal tokens.
**Fix:** Use httpOnly cookies for token storage.

---

### 13. No Token Refresh Mechanism
**Location:** `src/lib/auth.ts`
**Issue:** JWT has 15min expiry but no refresh token flow in login response.
**Impact:** Users must re-login every 15 minutes.
**Fix:** Implement refresh token mechanism (functions exist in auth.ts but not used).

---

### 14. create-profile Password Optional
**Location:** `src/app/api/auth/create-profile/route.ts:68`
**Issue:** Password is optional in create-profile (only set if provided and >= 8 chars).
```typescript
if (password && password.length >= 8) {
  const passwordHash = (await bcrypt.hash(password, 10)).replace('$2b$', '$2a$');
```
**Impact:** Users can skip password creation, relying on temp password from consent form.
**Fix:** Make password required in create-profile.

---

### 15. No Email Verification Flow
**Location:** Database schema has `email_verified` column
**Issue:** Column exists but no email verification flow implemented.
**Impact:** Users can't verify email, login check blocks non-cleaner roles.
**Fix:** Either implement email verification or remove the check.

---

## Low-Priority Issues

### 16. signup Route Role Default
**Location:** `src/app/api/auth/signup/route.ts:66`
**Issue:** Default role is 'client' but may not be appropriate for all use cases.
**Impact:** May not match business logic.
**Fix:** Review and set appropriate default role.

---

### 17. Pending Contracts Temp Password
**Location:** `src/app/api/pending-contracts/route.ts:119`
**Issue:** Uses phone digits as temp password without user awareness.
```typescript
const phoneDigits = contactNumber.replace(/\D/g, '');
const tempPasswordHash = (await bcrypt.hash(phoneDigits, 10)).replace('$2b$', '$2a$');
```
**Impact:** Users may not know their temp password is just their phone digits.
**Fix:** Document this clearly or use a different temp password generation method.

---

### 18. No Login Success Logging
**Location:** `src/app/api/auth/login/route.ts`
**Issue:** No audit logging for successful login attempts.
**Impact:** No security audit trail for logins.
**Fix:** Add `logAuthEvent` call on successful login.

---

## Recommended Fix Priority

### Phase 1: Critical (Fix Immediately)
1. Fix email_verified initialization in signup/register
2. Implement password_needs_reset check in login
3. Add sessions table initialization
4. Remove JWT_SECRET fallback or enforce environment variable

### Phase 2: High Priority (Fix This Week)
5. Standardize bcrypt rounds to 12
6. Standardize bcrypt prefix handling
7. Integrate login attempt tracking
8. Add password normalization to login
9. Add missing columns to signup INSERT
10. Review and fix CSRF on login

### Phase 3: Medium Priority (Fix Next Sprint)
11. Implement KV-backed rate limiting
12. Move to httpOnly cookie storage
13. Implement refresh token flow
14. Make password required in create-profile
15. Implement or remove email verification

### Phase 4: Low Priority (Technical Debt)
16. Review signup role default
17. Improve temp password communication
18. Add login audit logging

---

## Testing Recommendations

1. Test login with users created via each flow (signup, register, consent form)
2. Test login with username, email, and phone as identifiers
3. Test password change flow with both raw and normalized passwords
4. Test session management across multiple devices
5. Test rate limiting behavior
6. Test email_verified check with different roles
7. Test password_needs_reset flow
8. Test JWT expiration and refresh flow (when implemented)

---

**Report Generated:** May 30, 2026
**Reviewed By:** Cascade AI Assistant
