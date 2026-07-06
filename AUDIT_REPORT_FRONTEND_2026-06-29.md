# Comprehensive Frontend Audit Report
**Date:** 2026-06-29
**Auditor:** Cascade
**Scope:** Marketing Site + Internal Portal — All pages, API routes, dashboards, buttons, design system

---

## 1. CRITICAL BREAKAGES (Fix Immediately)

### 1.1 Chatbot Returns 401 Unauthorized
- **Root Cause:** `marketing-site/src/middleware.ts` `PUBLIC_PATHS` array missing `/api/chatbot`
- **Impact:** All public visitors get "I'm having trouble connecting..." instead of answers
- **Fix:** Add `/api/chatbot` to `PUBLIC_PATHS`

### 1.2 `ai_responses` Table Does Not Exist
- **Root Cause:** No migration creates `ai_responses` table in D1
- **Impact:** Chatbot falls back to hardcoded 13-entry KB; admin cannot add/edit responses
- **Files Affected:** `chatbot/route.ts`, `ai-responses/route.ts`, internal-portal proxy
- **Fix:** Create D1 migration + apply to prod/staging DBs

### 1.3 Marketing Site Layout Queries DB on Every Render
- **Root Cause:** `layout.tsx` calls `getDb()` and queries `content` table for background image
- **Impact:** Adds ~50-200ms to every page load; crashes if DB unavailable
- **Fix:** Move to ISR or client-side fetch with skeleton fallback

---

## 2. FRONTEND → BACKEND API MAPPING AUDIT

### Marketing Site (`/src/app/api/*` routes)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/health` | ✅ | Public, no auth |
| `/api/chatbot` | ❌ **BROKEN** | Blocked by middleware (401) |
| `/api/ai-responses` | ⚠️ | Admin-only; table missing |
| `/api/auth/*` (login, signup, etc.) | ✅ | In PUBLIC_PATHS |
| `/api/bookings` | ✅ | Requires auth |
| `/api/pricing` | ❓ | NOT in PUBLIC_PATHS — public visitors blocked |
| `/api/services` | ❓ | NOT in PUBLIC_PATHS — public visitors blocked |
| `/api/content/*` | ❓ | NOT in PUBLIC_PATHS — public visitors blocked |
| `/api/reviews` | ❓ | NOT in PUBLIC_PATHS — public visitors blocked |
| `/api/cleaners` | ❓ | NOT in PUBLIC_PATHS — public visitors blocked |
| `/api/leaders` | ❓ | NOT in PUBLIC_PATHS — public visitors blocked |
| `/api/quote` | ❓ | NOT in PUBLIC_PATHS — public visitors blocked |
| `/api/weekend-requests` | ✅ | Auth required (correct) |
| `/api/business-events` | ✅ | Auth required (correct) |
| `/api/customer/*` | ✅ | Auth required (correct) |
| `/api/payments/*` | ✅ | Auth required (correct) |
| `/api/tracking/*` | ✅ | Mixed (token-based) |
| `/api/diagnose/*` | ⚠️ | Service-token auth; internal use |
| `/api/analytics/*` | ⚠️ | Admin/service auth |
| `/api/employees` | ⚠️ | Auth required; but `/api/employees/[id]` route exists? |
| `/api/contracts` | ⚠️ | Auth required; but no `[id]` subroute for single contract |
| `/api/cleaner-profiles` | ⚠️ | Auth required; but cleaner-details is separate route |

**FINDING:** Many public-content API routes (`/api/pricing`, `/api/services`, `/api/content`, `/api/reviews`, `/api/cleaners`, `/api/leaders`) are **NOT** in `PUBLIC_PATHS`, meaning anonymous visitors to the marketing site will get 401 when these pages try to load public data. The frontend pages (`/services`, `/about`, `/`) likely call these and fail for non-logged-in users.

### Internal Portal (`/src/app/api/*` routes)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/auth/*` | ✅ | Login, logout, refresh, register, password reset |
| `/api/admin/*` | ✅ | All protected with `withAuth(['admin'])` |
| `/api/admin/new-joiners` | ✅ | List + approve/reject/create |
| `/api/admin/bookings` | ✅ | List all bookings |
| `/api/admin/users` | ✅ | User management |
| `/api/admin/payroll` | ✅ | Payroll view |
| `/api/admin/services` | ✅ | Service CRUD |
| `/api/admin/banking-details` | ✅ | Banking info |
| `/api/admin/roles` | ✅ | Role management |
| `/api/admin/permissions` | ✅ | Permission management |
| `/api/admin/audit-logs` | ✅ | Audit trail |
| `/api/admin/content` | ✅ | CMS content management |
| `/api/admin/proxy-observer` | ✅ | Proxy monitoring |
| `/api/admin/staff-reviews` | ✅ | Staff review endpoints |
| `/api/admin/cleaners` | ✅ | Cleaner overview |
| `/api/analytics/*` | ✅ | Booking/revenue/tracking analytics |
| `/api/v2/*` | ✅ | Supervisor jobs, staff KPI, pool transition |
| `/api/webhooks/*` | ✅ | n8n, WhatsApp, Cal.com webhooks |
| `/api/seed` / `/api/seed-users` | ⚠️ | Protected by SEED_KEY; should be disabled in prod |

---

## 3. DASHBOARD AUDIT

### 3.1 Marketing Site Dashboards

#### Client Dashboard (`/client-dashboard`)
- **Size:** 1,324 lines (monolithic)
- **State Count:** 30+ useState calls (bookings, payments, statements, zoho data, review forms, booking flow, etc.)
- **API Calls:** `fetchClientData()`, `fetchZohoData()`, `fetchCleanerStatus()`, polling every 30s
- **Issues:**
  - Massive single file — unmaintainable
  - Booking flow embedded in dashboard (calendar → form)
  - No component extraction
  - Zoho integration calls may fail silently
  - No loading skeletons for sub-sections
  - `localStorage` auth check on mount causes hydration mismatch risk

#### Business Dashboard (`/business-dashboard`)
- **Size:** 904 lines
- **Issues:**
  - Similar monolithic structure
  - Weekend requests + contracts + recurring bookings all in one file
  - No component extraction

#### Booking Pages
- `/book` and `/booking` are **different implementations** (duplicate pages)
- `/book` — simpler form
- `/booking` — Cal.com embed?

### 3.2 Internal Portal Dashboards

#### Admin Dashboard (`/admin-dashboard`)
- **Structure:** Uses `DashboardLayout.tsx` (shared layout)
- **Current Layout:**
  - Sticky top header with logo "SS", title, avatar, logout
  - Mobile hamburger menu (already exists!)
  - Desktop horizontal nav bar with links
  - Main content in centered white card
  - Footer with copyright
- **Tab System:** shadcn `<Tabs>` with 12+ tabs:
  - Overview, New Joiners, Employees, Services & Banking, Content, Cleaner Visibility, Training Ledger, Proxy Observer, Pricing Config, Pool Management, Staff Reviews, Admin Cleaner Overview
- **Issues:**
  - Graphs/stats are at the TOP of the overview tab, not CENTERED
  - Cards use generic stat boxes (not modern data viz)
  - No chart/graph library usage (just numbers in cards)
  - Tab content overflows on mobile
  - Tables are basic HTML, not responsive data tables
  - Action buttons scattered, no consistent placement

#### Cleaner Dashboard (`/cleaner-dashboard`)
- Pre-dashboard + main dashboard split
- Uses same `DashboardLayout`

#### Supervisor Dashboard (`/supervisor-dashboard`)
- Uses same `DashboardLayout`

---

## 4. DESIGN SYSTEM AUDIT

### 4.1 Marketing Site
- **Theme:** Glassmorphism (blue gradient background, frosted glass cards)
- **Colors:** Deep blue `#0b1a3a`, accent `#3b82f6`
- **Typography:** Geist Sans/Mono (Next.js font)
- **CSS:** Tailwind v4 with custom `@theme inline`
- **Components:** Custom glass-panel, glass-card classes
- **Buttons:** `.primary-button`, `.secondary-button` (custom CSS, not shadcn)
- **Cards:** Custom glass-card (not shadcn Card)
- **Forms:** Custom styled inputs
- **Responsiveness:** `.responsive-grid` utility, basic media queries

### 4.2 Internal Portal
- **Theme:** shadcn/ui with oklch grayscale (neutral greys)
- **Colors:** oklch-based (no brand colors!)
- **Typography:** Default sans (not Geist)
- **CSS:** Tailwind v4 with `@tailwind base/components/utilities`
- **Components:** shadcn/ui (Button, Card, Avatar, Tabs, Badge, etc.)
- **Buttons:** shadcn Button component
- **Cards:** shadcn Card component
- **Layout:** DashboardLayout with backdrop-blur header

### 4.3 Design System Problems
1. **No shared design system** — marketing and portal look like different products
2. **Portal is grayscale/oklch** — no brand identity (Deep Blue #1E3A8A, Teal #0D9488 per spec)
3. **Marketing glassmorphism is heavy** — backdrop-filter causes performance issues on mobile
4. **No dark mode toggle** — both have dark CSS vars but no toggle
5. **Inconsistent button styles** — marketing uses custom CSS, portal uses shadcn
6. **No design tokens file** — colors scattered across CSS files

---

## 5. BUTTON AUDIT (Sample of Key Buttons)

### Marketing Site
| Button | Location | Route/Handler | Status |
|--------|----------|---------------|--------|
| "Book Now" | Home page hero | `/book` or `/booking` | ⚠️ Duplicate target |
| "Get a Quote" | Home page | Opens QuoteModal | ✅ |
| "Send" (chatbot) | AIAssistant.tsx | `fetch('/api/chatbot')` | ❌ Returns 401 |
| "Login" | Auth page | `fetch('/api/auth/login')` | ✅ |
| "Sign Up" | Signup pages | `fetch('/api/auth/signup')` | ✅ |
| "Track Booking" | Client dashboard | `fetch('/api/tracking/...')` | ✅ |
| "Pay Now" | Payment verify | Paystack redirect | ⚠️ Needs testing |
| "Upload Photos" | Review section | `fetch('/api/upload')` | ⚠️ Needs testing |
| WhatsApp CTA | Multiple pages | `https://wa.me/...` | ✅ |

### Internal Portal
| Button | Location | Route/Handler | Status |
|--------|----------|---------------|--------|
| "Approve" | New Joiners tab | `/api/admin/new-joiners/:id/approve` | ✅ |
| "Reject" | New Joiners tab | `/api/admin/new-joiners/:id/reject` | ✅ |
| "Assign Cleaner" | Bookings tab | `/api/bookings/:id` (PUT) | ⚠️ Wrong endpoint? Should be `/api/admin/bookings/:id` |
| "Create Service" | Services tab | `/api/admin/services` (POST) | ✅ |
| "Save Banking" | Banking tab | `/api/admin/banking-details` | ✅ |
| "Logout" | DashboardLayout | `/api/auth/logout` + localStorage clear | ✅ |
| "Cleaner Login" | Auth page | `/api/auth/login` with paysheet code | ✅ |

**FINDING:** Admin dashboard "Assign Cleaner" calls `/api/bookings/${id}` (PUT) but the bookings API in marketing-site may not handle `cleaner_id` updates — the admin should use `/api/admin/bookings/:id` or a dedicated assign endpoint.

---

## 6. PERFORMANCE ISSUES

1. **layout.tsx DB query** — Every page hit queries D1 for background image
2. **Client dashboard polling** — 30-second polling without abort controller
3. **No code splitting** — Dashboards are single massive files
4. **No lazy loading** — All tabs render at once in admin dashboard
5. **No image optimization** — Background image loaded full-size
6. **No React.memo** — Dashboard components re-render constantly

---

## 7. MISSING FEATURES (Per Original Spec)

1. **ERPNext dashboard integration** — Not present in admin dashboard
2. **Cal.com booking embed** — Present but may not be wired to backend
3. **WhatsApp Meta Cloud API** — Backend exists, frontend chatbot uses fallback
4. **Real-time tracking map** — Track page exists but map component untested
5. **POPIA compliance UI** — Privacy page exists, but data deletion flow unclear
6. **13th cheque widget** — Mentioned in cleaner dashboard spec, not verified
7. **PWA** — Icons exist but service worker not verified

---

## 8. RECOMMENDED PHASE ORDER

### Phase 1: Fix Critical Breakages (Deploy + Verify)
1. Add `/api/chatbot` to `PUBLIC_PATHS`
2. Create `ai_responses` D1 migration
3. Apply migration to prod + staging
4. Fix layout.tsx DB query (move to client-side or ISR)
5. **Deploy marketing-site → verify prod + staging**

### Phase 2: Unify Design System (Deploy + Verify)
1. Create shared design tokens (colors, typography, spacing)
2. Apply brand colors (Deep Blue, Teal, Emerald) to portal
3. Standardize on shadcn components across both apps
4. Create shared component library (Button, Card, Input, Modal)
5. **Deploy both apps → verify prod + staging**

### Phase 3: Admin Dashboard Redesign (Deploy + Verify)
1. Redesign DashboardLayout:
   - Collapsible sidebar (icon + label) with hamburger
   - Fixed top bar (Profile, Notifications, Settings, Users)
   - Centered main content area
   - Graphs/charts in center using recharts
2. Extract admin tabs into separate components
3. Add loading skeletons for each tab
4. Make tables responsive with pagination
5. **Deploy internal-portal → verify prod + staging**

### Phase 4: Marketing Site Dashboard Redesign (Deploy + Verify)
1. Refactor client-dashboard into components (BookingsList, BookingForm, TrackingPanel, ReviewForm)
2. Refactor business-dashboard into components
3. Add modern charts for bookings/revenue
4. Improve mobile responsiveness
5. **Deploy marketing-site → verify prod + staging**

### Phase 5: ERP Dashboard Integration (Deploy + Verify)
1. Create `/admin/erp-console` page in marketing site
2. Embed ERPNext desk in iframe with auth passthrough
3. Add navigation link in admin dashboard
4. **Deploy → verify prod + staging**

### Phase 6: Global Button Audit & Fix (Deploy + Verify)
1. Audit every `<button>` and `<Button>` across both apps
2. Verify click handlers
3. Verify route targets
4. Add loading/disabled states
5. Ensure responsive sizing
6. **Deploy both apps → verify prod + staging**
