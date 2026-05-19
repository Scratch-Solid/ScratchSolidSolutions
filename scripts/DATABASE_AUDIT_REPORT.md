# Database Isolation Audit Report
**Date:** 2026-05-19
**Purpose:** Verify database bindings and data isolation for all applications

## Configuration Audit

### Internal Portal (scratchsolid-portal)
**Production:**
- Binding: `scratchsolid_db`
- Database: `scratchsolid-portal-db` (a08f16f5-9d75-47f9-973c-35bade106b47)
- Route: portal.scratchsolidsolutions.org
- Status: ✓ CORRECT

**Staging:**
- Binding: `scratchsolid_db`
- Database: `scratchsolid-db-portal-staging` (cc0bb727-585b-40c9-8afa-77947e725813)
- Route: portal-staging.scratchsolidsolutions.org
- Status: ⚠️ ISSUE - Database contains marketing tables, not portal-specific schema

### Marketing Site (scratchsolidsolutions)
**Production:**
- Binding: `scratchsolid_db`
- Database: `scratchsolid-marketing-db` (4c282c8f-8991-49bd-9dc6-e3eab31a4869)
- Routes: api.scratchsolidsolutions.org, scratchsolidsolutions.org
- Status: ✓ CORRECT

**Staging:**
- Binding: `scratchsolid_db`
- Database: `scratchsolid-db-staging` (6b6f139b-7a19-4d44-9e21-b85c0c0da42b)
- Routes: api-staging.scratchsolidsolutions.org, staging.scratchsolidsolutions.org
- Status: ⚠️ ISSUE - Database contains marketing tables but may need migration

### Backend Worker (cleaning-service-backend)
**Production:**
- Binding: `DB`
- Database: `scratchsolid-backend-db` (2a0b1e08-443e-46c4-8184-86ea180d4024)
- Status: ✓ CORRECT

**Staging:**
- Binding: `DB`
- Database: `scratchsolid-db-backend-staging` (67e66542-486a-442b-bbf6-9c3d4a503f4c)
- Status: ⚠️ PENDING - Need to verify schema

## Database Schema Audit

### Production Databases

**scratchsolid-portal-db (a08f16f5):**
- Tables: _cf_KV, d1_migrations, sqlite_sequence, session_activity, users, sessions, cleaner_profiles, staff, employees, leaders
- Schema: ✓ Portal-specific tables present
- Status: ✓ CORRECT

**scratchsolid-marketing-db (4c282c8f):**
- Tables: _cf_KV, d1_migrations, sqlite_sequence, users, sessions, bookings, services, service_pricing, promo_codes, quotes
- Schema: ✓ Marketing-specific tables present
- Status: ✓ CORRECT

**scratchsolid-backend-db (2a0b1e08):**
- Tables: _cf_KV, d1_migrations, sqlite_sequence, users, sessions, bookings, booking_services, booking_status_history, payments, payment_methods
- Schema: ✓ Backend-specific tables present
- Status: ✓ CORRECT

### Staging Databases

**scratchsolid-db-portal-staging (cc0bb727):**
- Tables: _cf_KV, services, sqlite_sequence, service_pricing, promo_codes, quotes, locations, quote_logs, cleaner_photos, client_feedback
- Schema: ⚠️ ISSUE - Contains marketing tables, not portal-specific schema
- Status: ⚠️ NEEDS MIGRATION

**scratchsolid-db-staging (6b6f139b):**
- Tables: _cf_KV, d1_migrations, sqlite_sequence, services, service_pricing, promo_codes, quotes, users, sessions, password_reset_tokens
- Schema: ✓ Marketing-specific tables present
- Status: ✓ CORRECT

**scratchsolid-db-backend-staging (67e66542):**
- Tables: _cf_KV, users, sqlite_sequence, sessions, roles, permissions, role_permissions, content_pages, background_images, cleaner_profiles
- Schema: ⚠️ ISSUE - Contains mixed portal/marketing tables, not backend-specific schema
- Status: ⚠️ NEEDS MIGRATION

## Data Count Audit

### Production Databases
- **scratchsolid-portal-db:** 0 users
- **scratchsolid-marketing-db:** 0 users
- **scratchsolid-backend-db:** 0 users

### Staging Databases
- **scratchsolid-db-portal-staging:** 3 users
- **scratchsolid-db-staging:** 0 users
- **scratchsolid-db-backend-staging:** (pending count)

## Issues Found

### Critical Issues
1. **scratchsolid-db-portal-staging** contains marketing tables instead of portal-specific schema
   - Expected: Portal-specific tables (staff, cleaner_profiles, booking_assignments, etc.)
   - Actual: Marketing tables (services, service_pricing, promo_codes, quotes)
   - Impact: Portal staging will not work correctly
   - Action Required: Run portal migration scripts on scratchsolid-db-portal-staging

2. **scratchsolid-db-backend-staging** contains mixed portal/marketing tables instead of backend-specific schema
   - Expected: Backend-specific tables (bookings, payments, invoices, etc.)
   - Actual: Mixed tables (users, sessions, roles, permissions, content_pages, background_images, cleaner_profiles)
   - Impact: Backend staging will not work correctly
   - Action Required: Run backend migration scripts on scratchsolid-db-backend-staging

### Pending Verification
1. **scratchsolid-db-staging** has marketing tables but may need migration
   - Action Required: Verify schema matches production marketing database

## Recommendations

### Immediate Actions
1. Run portal migration scripts on scratchsolid-db-portal-staging
2. Verify scratchsolid-db-backend-staging schema
3. Run backend migration scripts on scratchsolid-db-backend-staging if needed

### Regression Testing Required
1. Test portal production endpoints
2. Test portal staging endpoints (after migration)
3. Test marketing production endpoints
4. Test marketing staging endpoints
5. Test backend production endpoints
6. Test backend staging endpoints (after verification)

### Data Verification
1. Verify users table data in all databases
2. Verify sessions table data in all databases
3. Verify bookings table data in relevant databases
4. Verify service-specific data in each database

## Next Steps

1. Fix staging database schemas
2. Run migration scripts on staging databases
3. Test all application endpoints
4. Verify data isolation
5. Perform regression testing
6. Update staging database names to match production naming convention
