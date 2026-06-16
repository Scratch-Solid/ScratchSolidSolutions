# Database Schema Protection Strategy

**Date:** May 14, 2026
**Status:** ✅ COMPLETED

---

## Overview

This document outlines the database schema protection strategy for the Scratch Solid Solutions platform to ensure data integrity, prevent unauthorized schema changes, and maintain version control for database migrations.

---

## Current Migration System

### Migration Files

**Location:** `migrations/`

**Existing Migrations:**
- `001_add_email_verification_and_approval.sql` - Email verification and approval workflow
- `001_phase1_security_migration.sql` - Phase 1 security enhancements
- `002_add_2fa_columns.sql` - Two-factor authentication columns
- `services.sql` - Services table
- `update_services.sql` - Services table updates

### Migration Naming Convention

**Current Pattern:** Inconsistent
**Issue:** Multiple files with prefix `001`, no clear versioning

**Standardized Pattern:** `YYYYMMDD_description.sql`
- Example: `20260514_add_user_preferences.sql`
- Example: `20260514_update_payment_system.sql`

---

## Schema Protection Rules

### Production Database Protection

**Direct Modifications:** Prohibited
- No direct SQL modifications in production
- No schema changes without migration
- No data modifications without approval

**Migration Requirements:**
- All schema changes must go through migration files
- Migrations must be tested in staging first
- Migrations must be reversible (rollback)
- Migrations must be versioned

### Staging Database Protection

**Direct Modifications:** Restricted
- Allowed for testing purposes only
- Must be documented
- Must not be deployed to production

**Migration Requirements:**
- Same as production
- Additional testing encouraged

---

## Migration Workflow

### Development Phase

1. **Create Migration File**
   - Use standardized naming: `YYYYMMDD_description.sql`
   - Include up and down migrations
   - Add descriptive comments

2. **Test Locally**
   - Apply migration to local D1 database
   - Verify schema changes
   - Test rollback

3. **Code Review**
   - Submit migration for review
   - Review for potential data loss
   - Review for performance impact

### Staging Phase

1. **Deploy to Staging**
   - Apply migration to staging D1 database
   - Run integration tests
   - Verify data integrity

2. **Validate**
   - Check for errors
   - Monitor performance
   - Verify application compatibility

### Production Phase

1. **Create Backup**
   - Backup production database
   - Document backup location

2. **Deploy to Production**
   - Apply migration during maintenance window
   - Monitor for errors
   - Verify application functionality

3. **Post-Deployment**
   - Monitor for 24 hours
   - Document any issues
   - Update schema version

---

## Migration Structure

### Standard Migration Template

```sql
-- Migration: 20260514_add_user_preferences
-- Description: Add user preferences table for customization
-- Author: [Author Name]
-- Date: 2026-05-14

-- UP Migration
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(key);

-- DOWN Migration (Rollback)
DROP INDEX IF EXISTS idx_user_preferences_key;
DROP INDEX IF EXISTS idx_user_preferences_user_id;
DROP TABLE IF EXISTS user_preferences;
```

### Migration Best Practices

**Required Elements:**
- Migration ID (date + description)
- Description of changes
- Author name
- Date created
- UP migration (apply changes)
- DOWN migration (rollback changes)

**Guidelines:**
- Use IF NOT EXISTS for CREATE statements
- Use IF EXISTS for DROP statements
- Include indexes for performance
- Add foreign key constraints
- Document data type changes
- Consider data migration if needed

---

## Schema Versioning

### Version Tracking

**Table:** `schema_migrations`

**Structure:**
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT,
  author TEXT
);
```

**Usage:**
- Track applied migrations
- Prevent re-application
- Enable rollback to specific version

### Version File

**Location:** `migrations/VERSION`

**Format:**
```
CURRENT_VERSION=20260514
LAST_MIGRATION=add_user_preferences
```

---

## Rollback Strategy

### Automatic Rollback

**Trigger:** Migration failure

**Process:**
1. Detect migration failure
2. Execute DOWN migration
3. Restore from backup if needed
4. Log failure
5. Notify team

### Manual Rollback

**Trigger:** Data integrity issue or bug

**Process:**
1. Identify problematic migration
2. Execute DOWN migration manually
3. Restore from backup if needed
4. Document incident
5. Create fix migration

### Rollback Limitations

**Irreversible Changes:**
- DROP TABLE without backup
- DELETE data without backup
- ALTER COLUMN without backup

**Mitigation:**
- Always create backups before migration
- Test rollback in staging
- Document irreversible changes

---

## Schema Validation

### Pre-Deployment Checks

**Automated Checks:**
- Syntax validation
- Foreign key validation
- Index validation
- Data type validation

**Manual Checks:**
- Review for data loss
- Review for performance impact
- Review for application compatibility

### Post-Deployment Validation

**Automated Checks:**
- Schema integrity check
- Data integrity check
- Index usage check
- Performance baseline check

**Manual Checks:**
- Application functionality test
- Data consistency check
- User acceptance test

---

## Schema Change Categories

### Safe Changes

**Can be applied without downtime:**
- Adding new tables
- Adding new columns (nullable)
- Adding indexes
- Adding foreign keys (with CASCADE)
- Adding views

### Risky Changes

**Require careful planning:**
- Adding columns (non-nullable)
- Changing column types
- Adding constraints
- Modifying indexes
- Renaming objects

### Dangerous Changes

**Require special approval:**
- Dropping tables
- Dropping columns
- Dropping indexes
- Changing primary keys
- Large data migrations

---

## Database Backup Strategy

### Backup Schedule

**Automated Backups:**
- Daily full backup
- Hourly incremental backup
- Real-time WAL (if supported)

### Backup Retention

**Retention Policy:**
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months
- Annual backups: 7 years

### Backup Verification

**Verification Process:**
- Weekly restore test
- Monthly full restore test
- Quarterly backup audit

---

## Access Control

### Database Access

**Production Access:**
- Read-only access for developers
- Write access for DBAs only
- Schema changes require approval

**Staging Access:**
- Read/write access for developers
- Schema changes require review

**Local Access:**
- Full access for development
- No access control needed

### Audit Logging

**Log Events:**
- Schema changes
- Data modifications
- Access attempts
- Failed operations

**Log Retention:**
- 7 years (compliance requirement)

---

## Migration Tools

### Current Tools

**Wrangler D1:**
- `wrangler d1 execute` - Execute SQL
- `wrangler d1 migrations` - Manage migrations
- Local D1 for testing

### Future Enhancements

**Recommended Tools:**
- Custom migration runner
- Schema diff tool
- Migration testing framework
- Automated rollback system

---

## Documentation Requirements

### Migration Documentation

**Required:**
- Purpose of migration
- Data impact assessment
- Performance impact assessment
- Rollback procedure
- Testing performed

### Schema Documentation

**Required:**
- ERD diagrams
- Table descriptions
- Column descriptions
- Relationship descriptions
- Index descriptions

---

## Incident Response

### Schema Incident Types

**Data Loss:**
- Immediate rollback
- Restore from backup
- Investigate cause
- Document incident

**Performance Degradation:**
- Monitor metrics
- Rollback if severe
- Optimize query
- Document incident

**Application Failure:**
- Rollback migration
- Restore from backup
- Fix application
- Redeploy

---

## Compliance Considerations

### Data Retention

**Compliance:** GDPR, CCPA
**Implementation:** Data retention policies enforced via cleanup jobs
**Schema Support:** Created at timestamps on all tables

### Audit Trail

**Compliance:** SOC 2, GDPR
**Implementation:** Audit logs table with 7-year retention
**Schema Support:** audit_logs table with indexes

### Data Protection

**Compliance:** GDPR, CCPA
**Implementation:** Encryption at rest, access controls
**Schema Support:** No sensitive data in plain text

---

## Implementation Status

### Completed
- ✅ Migration files exist
- ✅ Database schema protection strategy documented
- ✅ Migration workflow documented
- ✅ Rollback strategy documented

### Pending
- ⏳ Standardize migration naming convention
- ⏳ Implement schema versioning table
- ⏳ Create migration runner script
- ⏳ Implement automated migration testing
- ⏳ Set up pre-deployment validation
- ⏳ Create ERD documentation

---

## Migration Runner Script (Future Implementation)

```javascript
// migrations/runner.js
import { execSync } from 'child_process';

class MigrationRunner {
  constructor(db, migrationsDir) {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  async getCurrentVersion() {
    const result = await this.db.prepare(`
      SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1
    `).first();
    return result?.version || null;
  }

  async getPendingMigrations() {
    const currentVersion = await this.getCurrentVersion();
    // Get all migration files newer than current version
  }

  async applyMigration(migrationFile) {
    // Read migration file
    // Execute UP migration
    // Record in schema_migrations
  }

  async rollbackMigration(migrationFile) {
    // Read migration file
    // Execute DOWN migration
    // Remove from schema_migrations
  }
}
```

---

## Related Documentation

**Related Documents:**
- DATA_RETENTION_POLICY.md - Data retention policies
- SECURITY_AUDIT.md - Security considerations
- CICD_PIPELINE.md - CI/CD integration

---

**Document Created:** May 14, 2026
**Status:** COMPLETED
**Next Steps:** Implement migration runner, standardize naming convention
