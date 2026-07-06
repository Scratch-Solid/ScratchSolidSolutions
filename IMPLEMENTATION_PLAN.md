# Implementation Plan — Admin Dashboard Rebuild + Promo Fixes + Paystack Audit

## Phase 1: Promo Code Critical Fixes (IN PROGRESS)
1. Migration `021_promo_schema_fixes.sql` — add missing columns (distribution_count, last_distributed_at, distribution_channels, clicks alias, promo_scans promo_code columns, bookings promo_code/discount_amount)
2. `internal-portal/src/app/api/promo-distribution/route.ts` — Fix `distributed_at` → `created_at`
3. `internal-portal/src/app/api/promo-codes/route.ts` GET — Add `withAuth` for admin when listing all codes
4. `marketing-site/src/app/api/bookings/route.ts` POST — Accept `promo_code` + `price`, validate server-side, increment `used_count`, persist discount
5. `marketing-site/src/lib/db.ts` — `createBooking` accepts `promo_code` and `discount_amount`
6. `marketing-site/src/app/p/[shortCode]/page.tsx` — Fix column names (`click_count` primary, `clicks` fallback; `promo_scans` use new columns)
7. `marketing-site/src/app/api/emails/send-promo/route.ts` — Add `withAuth` guard
8. `internal-portal/src/app/api/promo-codes/route.ts` POST — Add `min_amount` server-side validation (non-negative)
9. `marketing-site/src/components/BookingQuotePanel.tsx` — Send `promo_code` and `price` in booking POST body

## Phase 2: Auth Audit & Guards
- Scan every `internal-portal/src/app/api/**/*.ts` route
- Verify `withAuth` is applied where needed (admin endpoints)
- Verify public endpoints (csrf-token, public, chatbot, about-content, promo validation by code) do NOT wrongly require auth
- Fix any middleware false positives causing "session expired" / "csrf required" / "invalid token"
- Add `PUBLIC_PATHS` to `marketing-site/src/middleware.ts` and `internal-portal/src/middleware.ts` where missing

## Phase 3: Admin Dashboard Tear-Down
- Delete `internal-portal/src/app/AdminDashboard.tsx`
- Delete `internal-portal/src/components/DashboardLayout.tsx`
- Delete `internal-portal/src/app/admin-dashboard/page.tsx`
- Remove old `internal-portal/src/app/admin/` sub-pages that are being consolidated
- Clean up orphaned chart components if not reused

## Phase 4: New Admin Dashboard Build
### Design System
- Colors: Deep Blue `#1E3A8A` (primary), Teal `#0D9488` (secondary), Light Gray `#F3F4F6` (neutral), Emerald `#10B981` (success), Red `#DC2626` (alerts)
- Font: Inter (system fallback)
- Layout: collapsible sidebar (icon+label) + fixed top bar + centered content area
- Charts: dependency-free SVG (reuse MiniCharts.tsx pattern)
- Components: shadcn/ui (Card, Tabs, Badge, Button, Avatar, Dialog, Table, Input, Select, Toast)

### Architecture
- New `internal-portal/src/components/admin/AdminShell.tsx` — root layout shell with sidebar + topbar
- New `internal-portal/src/app/admin/page.tsx` — overview/dashboard hub
- Individual route pages for each major section (not all-in-one tabs):
  - `/admin/overview` — KPI cards, booking status donut, key metrics bar chart, quick actions
  - `/admin/employees` — new joiners approval + existing staff table
  - `/admin/services` — service & banking management
  - `/admin/cleaners` — cleaner visibility & pool management
  - `/admin/content` — CMS content management
  - `/admin/pricing` — pricing configuration
  - `/admin/pools` — pool management
  - `/admin/reviews` — staff reviews & ratings
  - `/admin/training` — training ledger
  - `/admin/analytics` — cleaner analytics / KPI
  - `/admin/proxy` — proxy observer
  - `/admin/onboarding` — onboarding funnel
  - `/admin/security` — security settings
  - `/admin/roles` — RBAC management
  - `/admin/monitoring` — system monitoring
  - `/admin/audit-logs` — audit trail
  - `/admin/erp` — ERPNext iframe console
- Each page: fetches its own data, handles loading/error states gracefully, no "failed to load" flashes
- Sidebar nav: grouped by function (Operations, Workforce, Finance, System)
- Top bar: global search, notifications bell, profile dropdown, quick theme toggle

### UX Principles
- No page loads with raw error messages
- Skeleton loaders on all data-dependent sections
- Empty states with helpful CTAs
- All tables: sortable, searchable, paginated
- All forms: inline validation, dirty-state guards
- Responsive: sidebar collapses to bottom nav on mobile
- Keyboard navigable, ARIA labels on all interactive elements

## Phase 5: Cancellation & Rescheduling Policy
- Add `cancellation_policy` table or fields to `bookings` (refund_eligibility, cancellation_reason, cancelled_at, rescheduled_from)
- New API: `POST /api/bookings/[id]/cancel` — checks 24h window, calculates refund, calls Paystack refund if applicable
- New API: `POST /api/bookings/[id]/reschedule` — checks 24h window, updates Cal.com booking via n8n webhook
- BookingQuotePanel: show policy in a collapsible disclosure before confirm
- Client dashboard: "Cancel" and "Reschedule" buttons on each booking with policy tooltip
- Admin dashboard: cancellation requests queue with approve/reject

## Phase 6: Paystack Deep Audit
- Review `marketing-site/src/app/api/payments/route.ts`
- Verify webhook handler signature verification
- Verify DB schema for payments (reference, amount, status, metadata, refunded_amount)
- Check refund API integration exists and is wired to cancellation flow
- Verify retry logic for failed webhooks
- Add reconciliation endpoint for admin dashboard

## Phase 7: Commit, Deploy, Verify
1. Stage all changes
2. Commit with detailed message
3. Push to `main` → triggers staging deploy
4. Watch GitHub Actions for green build
5. Tag `v2.0.39` → triggers production deploy
6. Verify live endpoints with curl/Playwright
7. Verify admin dashboard loads without auth errors
8. Verify promo code flow end-to-end

## Rollback Plan
- Every destructive change is preceded by a commit
- Old dashboard components kept until new one is verified live
- Database migrations additive only (no DROP COLUMN)
- If staging fails, revert commit and push

## Verification Checklist
- [ ] All 9 promo bugs fixed
- [ ] No unauthenticated admin endpoints
- [ ] No public endpoints falsely requiring auth
- [ ] New admin dashboard loads all pages without errors
- [ ] Cancellation/reschedule policy visible to users
- [ ] Paystack webhooks verified
- [ ] Staging deploy green
- [ ] Production deploy green
- [ ] Admin login works on production
- [ ] Promo code applies correctly end-to-end
