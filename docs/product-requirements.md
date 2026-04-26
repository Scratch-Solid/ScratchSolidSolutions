# Scratch Solid Solutions - Product Requirements Document

## Overview
Scratch Solid Solutions is a multi-role cleaning and facilities management platform consisting of:
- **Marketing Site**: Public-facing website for bookings and client signup
- **Internal Portal**: Admin dashboard, cleaner dashboard, business dashboard
- **Backend**: Cloudflare D1 database, API routes, Zoho Books integration

## Target Users
1. **Individual Clients**: Book one-time or recurring cleaning services
2. **Business Clients**: Sign contracts for ongoing commercial cleaning
3. **Cleaners**: View assigned tasks, update status, track earnings
4. **Admin/Operations**: Manage bookings, cleaners, contracts, payroll, content

## Core Features

### Phase 1: Foundation
- User authentication (JWT-based)
- Role-based access control (RBAC)
- Booking system with conflict resolution
- Client and business signup

### Phase 2: Business & Contracts
- Business contract management
- Business dashboard with contract tile
- Payment verification rules

### Phase 3: Cleaner Operations
- Cleaner status workflow (Idle → On way → Arrived → Completed)
- GPS confirmation for status changes
- Earnings tracking via task_completions
- Blocked cleaner prevention

### Phase 4: Admin & Operations
- Admin dashboard with all entities
- Booking assignment (manual, auto-rotation, nearest cleaner)
- Payroll amendment
- Contract updates with immutability
- Audit logging

### Phase 5: Notifications & Payments
- WhatsApp and email notifications
- Zoho Books invoice integration
- Payment reminders and overdue handling
- Refund/credit workflows

### Phase 6: Security & Polish
- Glassmorphism UI theme
- Input validation and XSS sanitization
- CSRF protection
- Secure auth tokens
- Soft delete with 30-day grace
- Data retention policies
- CI/CD pipeline

## Success Metrics
- Booking completion rate
- Cleaner response time
- Payment collection rate
- Admin action audit coverage
