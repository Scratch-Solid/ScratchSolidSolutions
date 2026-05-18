# Database Isolation Migration Guide

This guide documents the database isolation migration from a shared `scratchsolid-db` to three isolated databases.

## Overview

**Old Architecture:**
- Single shared database: `scratchsolid-db` (b4f175df)
- All three projects (Marketing, Portal, Backend) used the same database

**New Architecture:**
- `scratchsolid-portal-db` (a08f16f5-9d75-47f9-973c-35bade106b47) - Internal Portal only
- `scratchsolid-marketing-db` (4c282c8f-8991-49bd-9dc6-e3eab31a4869) - Marketing Site only
- `scratchsolid-backend-db` (2a0b1e08-443e-46c4-8184-86ea180d4024) - Backend Worker only

## Completed Steps

✅ Created isolated migration files for all three projects
✅ Created new production databases
✅ Updated wrangler configurations with new database IDs
✅ Removed `scratchsolid_db_local` binding from marketing worker
✅ Applied migrations to all three new databases
✅ Deployed workers with new configurations

## Pending Steps

### 1. Verify Worker Deployments
- Check that Marketing Site worker points to `scratchsolid-marketing-db`
- Check that Internal Portal worker points to `scratchsolid-portal-db`
- Check that Backend Worker points to `scratchsolid-backend-db`
- Verify `scratchsolid_db_local` binding is removed from marketing worker

### 2. Data Migration (Manual Step)
**IMPORTANT: Perform during maintenance window when applications are not in use**

```bash
# Export data from old shared database
npx wrangler d1 execute scratchsolid-db --remote --file=./scripts/export-current-data.sql

# Import data into new isolated databases
npx wrangler d1 execute scratchsolid-portal-db --remote --file=./scripts/import-portal-data.sql
npx wrangler d1 execute scratchsolid-marketing-db --remote --file=./scripts/import-marketing-data.sql
npx wrangler d1 execute scratchsolid-backend-db --remote --file=./scripts/import-backend-data.sql
```

**Data Distribution:**
- **Portal DB:** Users, sessions, bookings, staff, payroll, leave, notifications, audit logs, departments, teams, schedules, time tracking, performance reviews, documents, incident reports, compliance training, auth tables, consent forms, loyalty/referrals, operational features, GPS tracking, feedback/photos, POPIA compliance, staff pool, audit tables
- **Marketing DB:** Users, sessions, bookings, services, promotions, quotes, content, blog/newsletter, transparency features, analytics, loyalty/referrals
- **Backend DB:** Users, sessions, bookings, booking details, payments, invoices/transactions, Stripe integration, webhooks/API, integration logs, system config, migrations/health

### 3. Test Applications
- Test login on Internal Portal (portal.scratchsolidsolutions.org)
- Test login on Marketing Site (scratchsolidsolutions.org)
- Test API endpoints (api.scratchsolidsolutions.org)
- Verify data integrity across all three applications

### 4. Rename Staging Database
```bash
# Rename scratchsolid-db-staging to scratchsolid-marketing-db-staging
npx wrangler d1 create scratchsolid-marketing-db-staging
# Export data from old staging database and import to new
# Update wrangler.jsonc staging configuration
```

### 5. Delete Unused Databases
**ONLY AFTER VERIFICATION:**
```bash
# Delete old shared database
npx wrangler d1 delete scratchsolid-db

# Delete unused business database
npx wrangler d1 delete scratchsolid_business-db
```

### 6. Populate Local Development Database
```bash
# Apply all three schemas to local database for development
npx wrangler d1 migrations apply scratchsolid-db-local --local
# Run migrations from all three projects
```

## Rollback Plan

If migration fails:
1. Revert wrangler configurations to old database ID
2. Redeploy workers
3. Data remains in old database (no data loss)

## Verification Checklist

- [ ] All workers deployed with new database configurations
- [ ] Data migrated to all three isolated databases
- [ ] Login works on Internal Portal
- [ ] Login works on Marketing Site
- [ ] API endpoints functioning correctly
- [ ] No data loss detected
- [ ] Applications tested thoroughly
- [ ] Staging database renamed
- [ ] Old databases deleted (after verification)
- [ ] Local development database populated

## Contact

For issues or questions, refer to the migration scripts in `scripts/` directory.
