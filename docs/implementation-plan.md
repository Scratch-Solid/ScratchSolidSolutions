# Implementation Plan for ScratchSolidSolutions

## Purpose
This document captures a detailed implementation plan for building a premium cleaning service application. It unifies architecture, UX, infrastructure, security, and deployment into manageable phases.

## Overall Goals
- Build a secure, scalable booking and operations platform.
- Deliver a unified modern UI with glassmorphism styling.
- Use Cloudflare Workers, Pages, D1, R2, and Zoho Books.
- Ensure every user flow is complete and production-ready.

## Phase 0 — Architecture Alignment
### Objectives
- Lock the tech stack and architecture.
- Define a shared design system.
- Create a feature matrix across all product requirements.

### Deliverables
- Architecture diagram
- Tech stack decision record
- Feature matrix with `Present / Partial / Missing`
- Repo structure and directory conventions

### Tasks
1. Confirm which applications are required:
   - Marketing site
   - Client booking app
   - Cleaner dashboard
   - Admin dashboard
   - Zoho Books accounting integration
2. Standardize page styling and UI components.
3. Establish environment variables and secret management.
4. Create a repo-level `docs/` folder for technical specifications.

## Phase 1 — Core Booking System
### Objectives
- Build the booking app foundation.
- Ensure secure user auth.
- Implement booking creation and tracking.

### Data Models
- User (individual)
- Business
- Cleaner
- Booking
- Review
- Contract
- Audit log

### Backend APIs
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /booking/create`
- `GET /booking/:id`
- `PUT /booking/:id`
- `GET /bookings/current`
- `GET /bookings/previous`

### Frontend Pages
- Login / Signup
- Booking flow
- Dashboard
- Booking confirmation
- Profile settings

### Acceptance
- End-to-end signup, login, booking creation, and booking view work locally.
- UI is consistent, responsive, and polished.

## Phase 2 — Business Contracts
### Objectives
- Add business account flow.
- Implement contract booking and admin pricing.

### Backend APIs
- `POST /auth/signup/business`
- `POST /dashboard/contract/:id/extend`
- `GET /contract/:id`
- `PUT /dashboard/settings`
- `DELETE /dashboard/profile`
- `POST /dashboard/profile/restore`

### Business Features
- One-off cleaning
- Contract cleaning
- Fixed contract rules
- Admin pricing via API

## Phase 3 — Cleaner Experience
### Objectives
- Build cleaner dashboard and status workflow.
- Support payroll and blocked accounts.

### Backend APIs
- `POST /cleaner/status`
- `PUT /cleaner/profile`
- `GET /cleaner/dashboard`

### Workflows
- Cleaner status transitions
- GPS update support
- Earnings calculation
- Blocked cleaner login denial

## Phase 4 — Admin Operations
### Objectives
- Build admin control center.
- Support bookings, cleaners, payroll, and content.

### Backend APIs
- `GET /admin/cleaners`
- `GET /admin/users`
- `GET /admin/businesses`
- `GET /admin/bookings`
- `PUT /admin/bookings/:id/assign`
- `GET /admin/contracts`
- `PUT /admin/contracts/:id/update`
- `PUT /admin/payroll/:id/amend`
- `PUT /admin/content/:page`

### Requirements
- Role-based access control
- Admin audit logging
- Booking reassignment rules
- Content management integration

## Phase 5 — Notifications and Accounting
### Objectives
- Add notifications and Zoho accounting.

### Features
- WhatsApp notifications
- Email fallback
- Payment reminder schedule
- Zoho invoice creation
- POP verification and booking confirmation
- Overdue cancellation logic
- Refund and credit workflows

## Phase 6 — Polish and Launch
### Objectives
- Harden security and user experience.
- Finalize deployment.

### Deliverables
- Unified glassmorphism UI
- End-to-end tests
- Accessibility checks
- CI/CD release pipeline
- Production infra config

### Security
- Strong hashing, validation, sanitized inputs
- Token/session security
- Secret management outside source control

### Quality
- No stale or duplicate pages
- No visual overlap or broken layouts
- Consistent typography and spacing
- Responsive design across breakpoints

## Implementation Notes
- Keep all text, colors, spacing, and shading consistent.
- Use shared UI utilities for cards, buttons, and panels.
- Treat the marketing pages and app experience as one brand.
- Make every page feel premium and polished.
- Build incrementally with a strong focus on correctness.
