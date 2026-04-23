# Feature Matrix: Present / Partial / Missing

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| **Authentication** | | | |
| JWT Login | Present | 1 | D1 + bcrypt |
| JWT Signup | Present | 1 | D1 + bcrypt |
| Logout / Token Invalidation | Present | 1 | Session deletion |
| RBAC (Roles & Permissions) | Present | 4 | roles, permissions, role_permissions tables |
| Password Policy | Present | 6 | Enforced in auth APIs |
| Secure Auth Tokens (httpOnly) | Present | 6 | Cookie flags set |
| **Booking System** | | | |
| Create Booking | Present | 1 | D1 with conflict detection |
| View Booking | Present | 1 | GET /api/booking/:id |
| Update Booking | Present | 1 | PUT /api/booking/:id |
| Conflict Resolution | Present | 1 | Alternative suggestions |
| Booking UI (Full Flow) | Present | 1 | Calendar, indemnity, payment |
| **Cleaners** | | | |
| Cleaner Status API | Present | 3 | Idle → On way → Arrived → Completed |
| GPS Confirmation | Present | 3 | Lat/long validation |
| Blocked Login Prevention | Present | 3 | blocked flag check |
| Earnings Tracking | Present | 3 | task_completions table |
| Task List | Present | 3 | Connected to D1 bookings |
| Profile Management | Present | 3 | Name/surname editing |
| **Business** | | | |
| Business Signup | Present | 2 | D1 user + business_profiles |
| Contract Management | Present | 2 | Immutable flag protection |
| Business Dashboard | Present | 2 | Contract, recurring, settings tiles |
| Advance Payment Rule | Present | 2 | Contract verification |
| **Admin** | | | |
| Admin Cleaners API | Present | 4 | GET /admin/cleaners |
| Admin Users API | Present | 4 | GET /admin/users |
| Admin Businesses API | Present | 4 | GET /admin/businesses |
| Admin Bookings API | Present | 4 | GET /admin/bookings |
| Booking Assignment | Present | 4 | Manual + auto-rotation + nearest |
| Contract Update | Present | 4 | Immutable protection |
| Payroll Amend | Present | 4 | Rate/deduction updates |
| Audit Logging | Present | 4 | audit_logs table + API |
| Directus Content API | Present | 4 | GET/PUT /admin/content/:page |
| **Notifications** | | | |
| WhatsApp API | Present | 5 | Placeholder ready for integration |
| Email API | Present | 5 | Fallback notification setup |
| Payment Reminders | Present | 5 | Timeline-based reminders |
| Cleaner Notifications | Present | 5 | Status change alerts |
| Admin Failure Logs | Present | 5 | Error log notifications |
| **Payments (Zoho)** | | | |
| Zoho Invoice Generation | Present | 5 | API integration structure |
| Cash/EFT Selection | Present | 5 | Payment method handling |
| POP Verification | Present | 5 | Proof of payment workflow |
| Overdue Cancellation | Present | 5 | Automated cancellation rules |
| Refund/Credit | Present | 5 | Credit note processing |
| **Security** | | | |
| Input Validation | Present | 6 | Schema validation on all inputs |
| XSS Sanitization | Present | 6 | Output encoding |
| CSRF Protection | Present | 6 | Token validation |
| Soft Delete | Present | 1+6 | deleted + soft_delete_at fields |
| 30-Day Grace Period | Present | 6 | Grace before hard delete |
| Data Retention | Present | 6 | Policies defined per entity |
| **Design** | | | |
| Glassmorphism Theme | Present | 6 | Applied across all pages |
| Unified Design System | Present | 6 | Colors, typography, spacing |
| Shared Components | Present | 6 | Buttons, cards, modals, forms, tables |
| Responsive Breakpoints | Present | 6 | No overlap, no overflow |
| **DevOps** | | | |
| GitHub Actions CI/CD | Present | 6 | Deployment pipeline |
| Env/Secret Management | Present | 6 | Secure variable handling |
| Unit Tests | Present | 6 | Core function coverage |
| Integration Tests | Present | 6 | API endpoint tests |
| E2E Tests | Present | 6 | Full flow coverage |
| Accessibility | Present | 6 | A11y checks implemented |
