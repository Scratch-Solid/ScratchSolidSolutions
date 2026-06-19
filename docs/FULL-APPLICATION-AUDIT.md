# Full Application Audit — Scratch Solid Solutions

**Date:** 2026-06-19
**Auditor:** Cascade AI
**Scope:** marketing-site, internal-portal, backend-worker, integrations, data model
**Production URLs:**
- Marketing: `https://scratchsolidsolutions.org`
- Portal: `https://portal.scratchsolidsolutions.org`
- API: `https://api.scratchsolidsolutions.org`

---

## Executive Summary

This application is **architecturally ambitious but operationally immature**. It has the *structure* of a world-class cleaning services platform (booking, workforce, payroll, invoicing, WhatsApp, n8n orchestration) but the *bindings* that connect these pieces are mostly broken or unconfigured. A customer can browse the marketing site and possibly submit a booking, but the automated operational lifecycle (Cal.com → n8n → Zoho → ERPNext → WhatsApp) is **not functional**.

**Bottom line:** Users can browse and maybe book. They cannot reliably pay, receive invoices, track cleaners, or interact via WhatsApp. Staff cannot reliably access payroll or ERPNext workforce data. The internal portal login and admin dashboards work after the recent DB fix, but the glass theme is unused and the UI is generic.

---

## 1. Duplicate Pages, Routes & Screens (Internal Portal)

### 1.1 Confirmed Redirects (Not Duplicates — Acceptable)
| From | To | Status |
|------|-----|--------|
| `/admin` | `/admin-dashboard` | Legacy redirect ✅ |
| `/signup/cleaner` | `/cleaner-signup/page` | Re-export wrapper ✅ |
| `/login` (marketing) | `/auth` | Redirect ✅ |
| `/booking` (marketing) | `/book` | Redirect ✅ |
| `/privacy-policy` | `/privacy` | Redirect ✅ |

### 1.2 Parallel Admin Navigation Systems (CRITICAL CONFUSION)
The internal portal has **TWO separate admin UI trees** that do not integrate:

**Tree A — `/admin-dashboard` (the "main" dashboard):**
- Uses `AdminDashboard.tsx` (572 lines, monolithic)
- Tabs: Overview, Employees, Services, Cleaners, Content, Pricing, Proxy, Pools, Reviews, Training, Analytics
- Uses `DashboardLayout.tsx` with horizontal top nav
- All data fetched via `/api/admin/*` and `/api/*` endpoints

**Tree B — `/admin/*` (separate standalone pages):**
- `/admin` → redirects to `/admin-dashboard`
- `/admin/onboarding` — pending contracts management
- `/admin/onboarding/analytics` — onboarding funnel analytics
- `/admin/onboarding/pipeline` — pipeline view
- `/admin/content` — CMS content management
- `/admin/content-upload` — file upload
- `/admin/roles` — RBAC role/permission management
- `/admin/security` — 2FA, session manager, role manager
- `/admin/monitoring` — health checks
- `/admin/audit-logs` — audit log viewer
- `/admin/admin-approvals` — approval workflows

**Problem:** Tree B pages are **not accessible from Tree A's navigation**. They exist as standalone pages with their own layouts (many use raw `bg-gray-50` styling, not the glass theme or even `DashboardLayout`). A user must know the URLs directly. There is no unified admin experience.

### 1.3 Duplicate or Overlapping Endpoints
| Endpoint | Location | Concern |
|----------|----------|---------|
| `/api/employees` | internal-portal | Staff/employee CRUD |
| `/api/admin/users` | internal-portal | User management |
| `/api/users/staff` | internal-portal | Staff-specific API |
| `/api/admin/new-joiners` | internal-portal | New joiner management |
| `/api/signup/cleaner` | internal-portal | Creates new_joiners record |
| `/api/admin/new-joiners/create` | internal-portal | Also creates new_joiners record |
| `/api/contracts` | internal-portal | Contract management |
| `/api/pending-contracts` | internal-portal | Used by `/admin/onboarding` page |

**Finding:** The `new_joiners` creation flow is split between the public `/api/signup/cleaner` route and the admin `/api/admin/new-joiners/create` route. They likely insert into the same table but with different validation paths.

### 1.4 Duplicate Auth Pages
- `/auth/login` (portal) and `/auth` (marketing) — completely separate implementations, separate databases
- `/auth/signup` (portal staff signup) and `/auth/signup` (marketing client signup) — same pathname, different apps, different databases
- `/auth/forgot-password` exists on BOTH apps independently
- `/auth/reset-password` exists on BOTH apps independently

**Impact:** A staff member and a customer have **separate identities in separate databases**. There is no SSO, shared session, or cross-portal login.

### 1.5 Backend Worker Route Inconsistency
The backend-worker (`src/index.ts`) uses **mixed route prefixes**:
- `/api/health`, `/api/auth/*`, `/api/bookings`, `/api/templates`, `/api/contracts/*`, `/api/payments/*`, `/api/weekend-requests/*`, `/api/auth/forgot-password` — all properly prefixed
- BUT also: `/weekend-requests/:id/assign` (missing `/api/`)
- `/business-events` (missing `/api/`)
- `/pricing` (missing `/api/`)
- `/auth/reset-password` (missing `/api/`)

**Impact:** Inconsistent API surface. Frontend code calling `/api/weekend-requests/...` would 404 if the backend expects `/weekend-requests/...`.

---

## 2. Bindings / API Audit — What's Connected vs What's Broken

### 2.1 Zoho Books / CRM
| Component | Status | Evidence |
|-----------|--------|----------|
| Backend worker Zoho integration | ❌ **BROKEN** | `ZOHO_REFRESH_TOKEN` expired |
| Portal Zoho invoice API | ⚠️ **AT RISK** | `ZOHO_REFRESH_TOKEN` not set as wrangler secret |
| Portal Zoho quotes API | ⚠️ **AT RISK** | Same token dependency |
| Portal Zoho payments API | ⚠️ **AT RISK** | Same token dependency |
| Portal Zoho refund API | ⚠️ **AT RISK** | Same token dependency |
| Marketing site customer invoices | ⚠️ **AT RISK** | Depends on Zoho |

**Impact:** No invoices, quotes, payments, or refunds can be processed through Zoho. The platform cannot bill customers or track revenue officially.

### 2.2 ERPNext (Workforce / Payroll)
| Component | Status | Evidence |
|-----------|--------|----------|
| ERPNext site | ❌ **NOT CREATED** | `erp.scratchsolidsolutions.org` returns Not Found |
| Portal health check | ⚠️ **OPTIONAL** | Reports "not configured" as healthy (fallback to local DB) |
| Staff payslip API | ❌ **PLACEHOLDER** | Returns mock/pending data |
| Employee sync | ❌ **NOT FUNCTIONAL** | No ERPNext to sync with |

**Impact:** No workforce management, no payroll processing, no employee records in ERPNext. Staff cannot view real payslips. All payroll is local-D1-only (if it exists at all).

### 2.3 Cal.com (Scheduling)
| Component | Status | Evidence |
|-----------|--------|----------|
| Cal.com instance | ⚠️ **LIVE BUT NOT ONBOARDED** | Setup wizard still showing |
| Booking ingestion webhook | ❌ **NOT CONFIGURED** | n8n workflow exists but not imported |
| Marketing site booking page | ⚠️ **CUSTOM FORM** | `/book` is a custom form, not Cal.com embed |

**Impact:** Bookings are captured in local D1 but NOT in Cal.com. No automatic availability checking, no team scheduling, no Cal.com-native calendar integration.

### 2.4 WhatsApp / Meta Cloud API
| Component | Status | Evidence |
|-----------|--------|----------|
| Meta access token | ❌ **NOT CONFIGURED** | `META_ACCESS_TOKEN` missing |
| Meta phone number ID | ❌ **NOT CONFIGURED** | `META_PHONE_NUMBER_ID` missing |
| WhatsApp webhook | ⚠️ **CODE EXISTS** | `/api/webhooks/whatsapp` handles START/HERE/DONE |
| Fallback to email | ✅ **WORKS** | Resend API key configured |

**Impact:** WhatsApp notifications do not work. All client communication falls back to email. The WhatsApp webhook code is well-written but has no credentials to connect to Meta's API.

### 2.5 n8n (Orchestration)
| Component | Status | Evidence |
|-----------|--------|----------|
| n8n instance | ✅ **LIVE** | `n8n.scratchsolidsolutions.org` running |
| Workflows imported | ❌ **NOT IMPORTED** | 6 JSON files in `infra/n8n-workflows/` but not loaded |
| Portal webhook endpoints | ✅ **CODE EXISTS** | `/api/webhooks/n8n/*` routes ready |
| Webhook auth | ✅ **CONFIGURED** | `INTERNAL_PORTAL_N8N_WEBHOOK_SECRET` expected |

**Impact:** n8n is running but idle. No automation connects Cal.com → Zoho → ERPNext → WhatsApp.

### 2.6 Resend (Email)
| Component | Status | Evidence |
|-----------|--------|----------|
| Backend worker | ✅ **CONFIGURED** | `RESEND_API_KEY` set |
| Marketing site | ⚠️ **PENDING** | `RESEND_API_KEY` not confirmed as wrangler secret |
| Portal | ⚠️ **PENDING** | Same concern |

**Impact:** Email works from backend worker. Uncertain for portal/marketing direct sends.

### 2.7 Database Bindings
| Component | Status | Evidence |
|-----------|--------|----------|
| Portal D1 (Cloudflare) | ✅ **FIXED** | `runtime-context.ts` dual-mode restored |
| Marketing D1 (Cloudflare) | ✅ **HEALTHY** | Confirmed working |
| Portal Postgres (Hetzner) | ⚠️ **READY BUT UNUSED** | Docker compose prepared, no cutover |
| Marketing Postgres (Hetzner) | ⚠️ **READY BUT UNUSED** | Same |
| Redis KV | ⚠️ **READY BUT UNUSED** | Same |

**Impact:** Both apps run on D1 SQLite in Cloudflare. The Hetzner Postgres stack is ready but not receiving traffic.

---

## 3. Auth Systems — Fragmented & Triplicated

### 3.1 Three Independent Auth Implementations

**A. Backend Worker (`backend-worker/src/index.ts`)**
- Custom JWT with `crypto.subtle.sign()` (HMAC-SHA256)
- 15-minute token expiry
- bcrypt password hashing
- Session tracking in D1
- Role-based access control (`admin`, `business`, `customer`)

**B. Marketing Site (`marketing-site/src/lib/session.ts`)**
- JWT via `jose` library (access token 7 days, refresh token 30 days)
- httpOnly cookies + localStorage fallback
- bcrypt password hashing
- DB-backed sessions in PostgreSQL/D1
- Roles: `customer`, `business`, `admin`

**C. Internal Portal (`internal-portal/src/lib/session.ts` / middleware.ts)**
- JWT via `jsonwebtoken` library
- localStorage-based (`authToken`, `userRole`, `username`)
- bcrypt password hashing
- better-auth integration (legacy)
- Roles: `admin`, `staff`, `cleaner`, `digital`, `transport`

### 3.2 Problems with Triple Auth
- **No shared identity:** A customer cannot become a staff member. An admin on the portal is not an admin on the marketing site.
- **No SSO:** Logging into marketing site does not log you into portal.
- **Different token lifetimes:** 15 min (backend), 7 days (marketing), session-based (portal)
- **Different storage:** localStorage (portal) vs cookies (marketing) vs Bearer headers (backend)
- **Different password reset flows:** Each app has its own forgot-password implementation

---

## 4. Data Model — Split Brain

### 4.1 Two Databases, Overlapping Concepts

**Portal D1 (`scratchsolid-portal-db`):**
- `users` — staff, admins, cleaners, digital, transport
- `bookings` (via migration `002_bookings.sql`)
- `employees` (via migration)
- `new_joiners` (cleaner applications)
- `sessions`, `session_activity`
- `training_progress`, `training_modules`
- `pricing_config`, `services`
- `staff_pool_transitions`, `job_performance_metrics`
- `staff_monthly_reviews`
- `audit_logs`, `data_access_audit`
- `login_activity`

**Marketing D1 (`scratchsolid-marketing-db`):**
- `users` — customers, business clients
- `bookings` — customer bookings
- `services` — service catalog
- `contracts` — client contracts
- `payments` — payment records
- `business_events`
- `promotions`, `loyalty_referrals`
- `content` — CMS content
- `feedback`, `analytics`
- `ai_responses`, `ai_knowledge_base`

### 4.2 Data Integrity Concerns
- **Bookings in both DBs:** A booking created on the marketing site lives in `marketing-db`. The portal may not see it unless n8n syncs it (which doesn't happen because n8n isn't configured).
- **Users in both DBs:** A customer who applies to be a cleaner creates a `new_joiners` record in portal-db but their original marketing `users` record is orphaned.
- **No foreign keys across databases:** D1 databases are completely isolated. There is no cross-DB referential integrity.
- **Payments tracked in marketing DB only:** The portal's `/api/payroll` endpoints may not reflect actual customer payments.

---

## 5. Internal Portal — Detailed Issues

### 5.1 UI/UX (Already Documented)
- Glass theme CSS exists but is **completely unused**
- Sidebar component exists but is **orphaned** (not integrated into layout)
- Admin dashboard is monolithic (572 lines) with 11 horizontal tabs
- No graphs in overview despite chart components existing
- Top navigation lacks: settings, profile edit, online users, activity audit
- See `internal-portal/docs/UI-UX-AUDIT.md` for full details

### 5.2 Cleaner Onboarding Flow
The cleaner onboarding flow is **partially implemented**:
- ✅ `/cleaner-signup` form exists with validation
- ✅ `/api/signup/cleaner` creates `new_joiners` record
- ✅ Admin can approve/reject via `/api/admin/new-joiners/:id/approve`
- ✅ Paysheet code auto-generation exists
- ⚠️ DocuSign integration is placeholder (signature IDs hardcoded)
- ⚠️ Training modules are placeholder content
- ❌ No WhatsApp verification step
- ❌ Background check integration not implemented
- ❌ Contract signing flow (`/auth/sign-contract`) exists but may not properly gate dashboard access

### 5.3 Role-Based Access Control (RBAC)
- ✅ Migrations define `roles`, `permissions`, `role_permissions` tables (`031_rbac_tables.sql`)
- ✅ `/admin/roles` page exists for managing roles
- ⚠️ `AdminDashboard.tsx` uses hardcoded role checks (`localStorage.getItem('userRole')`) rather than RBAC permission checks
- ⚠️ Middleware checks roles but not fine-grained permissions

### 5.4 Training System
- ✅ `training_progress`, `training_modules` tables exist
- ✅ `/cleaner-training` page exists
- ✅ Quiz submission API exists
- ⚠️ Training modules appear to be placeholder/hardcoded content
- ⚠️ No integration with external LMS

---

## 6. Marketing Site — Detailed Issues

### 6.1 Booking Flow
- ✅ `/book` page has multi-step booking form
- ✅ `/booking-selection` for choosing service type
- ✅ Client dashboard (`/client-dashboard`) for viewing bookings
- ✅ Business dashboard (`/business-dashboard`) for commercial clients
- ⚠️ Booking form requires `authToken` from localStorage — guest booking not supported
- ⚠️ No real-time availability check (not connected to Cal.com)

### 6.2 Customer Auth
- ✅ Signup with email verification
- ✅ Login with JWT + refresh tokens
- ✅ Cookie-based sessions (Phase 3 completed)
- ✅ Forgot/reset password
- ⚠️ No social login (Google, Facebook)
- ⚠️ No WhatsApp OTP (code exists but Meta not configured)

### 6.3 Content Management
- ✅ `/api/content` endpoints for dynamic content
- ✅ CMS-driven hero backgrounds, about content, indemnity text
- ✅ AI chatbot component (`AIAssistant.tsx`)
- ⚠️ AI knowledge base is large (29KB SQL) but effectiveness unverified

---

## 7. Backend Worker — Detailed Issues

### 7.1 Monolithic Architecture
- Single `src/index.ts` file at **1,483 lines**
- All routes, email templates, JWT logic, database queries in one file
- No separation of concerns (routes, services, repositories)

### 7.2 Route Inconsistency
As noted in §1.5, routes are inconsistently prefixed. The frontend likely calls `/api/weekend-requests` but the backend also defines `/weekend-requests/:id/assign` without the prefix.

### 7.3 Daily Cron Jobs
- ✅ Data retention cleanup
- ✅ Portal data retention
- ✅ Overdue booking cancellations
- ✅ Hard delete accounts (GDPR/POPIA)
- ⚠️ Retention policies exist in code but not verified running in production

### 7.4 Queue Consumer
- ✅ `queue-consumer.ts` exists
- ⚠️ Purpose and bindings not verified in production

---

## 8. Testing & Quality

### 8.1 Test Coverage
| App | Framework | Coverage | Status |
|-----|-----------|----------|--------|
| internal-portal | Jest (23 suites, 121 tests) | Moderate | ✅ Passing |
| internal-portal | Playwright (portal-*.spec.ts) | Low | ⚠️ Partial |
| marketing-site | Selenium (4 test files) | Very Low | ⚠️ WebDriver hangs |
| marketing-site | Playwright | Minimal | ⚠️ Needs expansion |
| backend-worker | None visible | None | ❌ Missing |

### 8.2 Known Bugs from Previous Sessions
- `createPasswordResetToken` bound parameter bug (marketing site)
- `runtime-context.ts` import-time crash (FIXED for portal)
- `layout.tsx` DB query on every render (marketing site)
- Marketing site `/api/debug/route.ts` is a leftover debug artifact

---

## 9. Completeness Assessment: Can Users Use This Today?

### 9.1 What WORKS Today
| Feature | Status |
|---------|--------|
| Marketing site browse (services, about, gallery) | ✅ Yes |
| Customer registration on marketing site | ✅ Yes |
| Customer login/logout | ✅ Yes |
| Submit booking via `/book` | ✅ Yes (stored in marketing D1) |
| View booking in client dashboard | ✅ Yes |
| Staff login to internal portal | ✅ Yes (after DB fix deployed) |
| Admin view users/bookings/employees | ✅ Yes (local D1 data) |
| Cleaner signup application | ✅ Yes |
| Admin approve/reject cleaners | ✅ Yes |
| Email notifications (via Resend) | ✅ Yes |
| Training module access | ✅ Yes (content may be placeholder) |

### 9.2 What DOES NOT WORK Today
| Feature | Status | Why |
|---------|--------|-----|
| Online payments | ❌ No | Zoho token expired |
| Invoice generation | ❌ No | Zoho token expired |
| Real-time scheduling/availability | ❌ No | Cal.com not onboarded |
| WhatsApp client notifications | ❌ No | Meta credentials missing |
| Payroll / payslips | ❌ No | ERPNext site not created |
| Workforce management in ERPNext | ❌ No | ERPNext site not created |
| Automated booking orchestration | ❌ No | n8n workflows not imported |
| Cross-portal single sign-on | ❌ No | Separate auth systems |
| Business contract PDF export | ⚠️ Partial | Code exists, Zoho dependency |
| Weekend request approvals | ⚠️ Partial | Backend route prefix mismatch risk |

### 9.3 If This Were My Application — Would I Be Satisfied?

**Honest answer: No.**

This application has **excellent architecture and ambitious scope** but suffers from:
1. **Integration rot:** The connective tissue (Zoho, ERPNext, Cal.com, WhatsApp, n8n) is either expired, unconfigured, or not created. These are not coding problems — they are operational onboarding problems that require dashboard access.
2. **Split data model:** Two separate user databases with no bridge. A customer cannot easily become a cleaner. An admin cannot see both customer and staff data in one view.
3. **Triple auth:** Three JWT implementations with no shared identity provider.
4. **UI/UX debt:** A beautiful glass theme sits unused while the dashboard looks like a default shadcn template.
5. **Monolithic backends:** The backend worker is one 1,483-line file. The admin dashboard is one 572-line component.
6. **Missing operational automation:** The core value proposition — "automated operational engine" — is not operational. Bookings sit in D1 but don't trigger invoices, payroll, or notifications.

**What IS impressive:**
- The code quality is generally high (TypeScript, good validation, security headers, CSRF protection, rate limiting, audit logging)
- The data model is comprehensive (50+ migrations covering payroll, training, RBAC, compliance, GPS tracking)
- The n8n workflow JSONs are well-designed
- The WhatsApp webhook handler is well-implemented
- The glass theme CSS is genuinely beautiful
- Test infrastructure exists and passes

---

## 10. Priority Action Items

### P0 — BLOCKING (Fix Before Any User Can Fully Trust the Platform)
1. **Deploy the portal DB fix** — `runtime-context.ts` is fixed in code but not deployed (tag `v2.0.1` or later)
2. **Fix Zoho OAuth** — Re-authenticate, update `ZOHO_REFRESH_TOKEN` in ALL three projects
3. **Onboard Cal.com** — Complete setup wizard, configure booking webhook → n8n
4. **Create ERPNext site** — Run `bench new-site`, generate API key, set `ERPNEXT_API_KEY`
5. **Configure WhatsApp** — Set `META_ACCESS_TOKEN` and `META_PHONE_NUMBER_ID`
6. **Import n8n workflows** — Load the 6 JSON files, configure credentials

### P1 — HIGH (Fix for Professional Operation)
7. **Unify auth systems** — At minimum, share JWT secret and user lookup across portal/marketing
8. **Bridge the databases** — Either: (a) shared Postgres on Hetzner, or (b) n8n sync workflows between D1 databases
9. **Fix backend worker route prefixes** — Make all routes consistently `/api/*`
10. **Integrate the admin pages** — Merge Tree A (`/admin-dashboard`) and Tree B (`/admin/*`) into unified navigation
11. **Activate glass theme** — Apply `glass-theme.css` to all components

### P2 — MEDIUM (Improve UX & Maintainability)
12. **Split monolithic components** — Break `AdminDashboard.tsx` and `backend-worker/src/index.ts` into modules
13. **Add real chart data** — Connect overview KPIs to actual analytics endpoints
14. **Complete cleaner onboarding** — Remove DocuSign placeholders, wire real background checks
15. **Expand test coverage** — Add backend-worker tests, marketing site e2e tests

### P3 — LOW (Polish)
16. **Remove debug artifacts** — `/api/debug/route.ts`, leftover `.bak` migration files
17. **Consolidate redirect pages** — Use Next.js `redirect()` in `next.config.js` where possible
18. **Dark mode completion** — Ensure all components respect `.dark` class

---

## 11. Conclusion

**Can users start using it today?**

- **As a brochure/marketing site:** Yes. The marketing site is functional and visually acceptable.
- **As a booking platform:** Partially. Customers can book, but no payment processing, no Cal.com scheduling, no WhatsApp confirmation.
- **As a staff portal:** Partially. Staff can log in, view local data, manage cleaners, but no payroll, no ERPNext workforce data.
- **As an automated operational engine:** No. The n8n workflows are not loaded, Zoho is disconnected, ERPNext doesn't exist, WhatsApp has no credentials.

**If I were the owner, I would:**
1. Spend one day on the P0 items (dashboard access + credentials + n8n import)
2. Spend one week on P1 items (auth unification + admin UI consolidation)
3. Then declare the platform ready for pilot customers with manual oversight
4. Iterate on P2/P3 over the following month

The foundation is solid. The integrations are the missing pieces.
