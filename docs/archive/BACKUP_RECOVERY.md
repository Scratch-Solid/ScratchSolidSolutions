# Backup and Recovery Procedures

## Overview

This document outlines the backup and recovery procedures for the Scratch Solid Solutions Internal Portal.

## Cloudflare D1 Backups

Cloudflare D1 provides automated backups for SQLite databases. The following backup features are available:

### Automated Backups
- **Point-in-time recovery**: D1 automatically creates backups every 6 hours
- **Retention**: Backups are retained for 30 days
- **Restoration**: Can restore to any point within the retention window

### Manual Backup Commands

```bash
# Export database to SQL file
npx wrangler d1 export scratchsolid-db --output=backup-$(date +%Y%m%d).sql

# Import database from SQL file
npx wrangler d1 import scratchsolid-db --file=backup-20250107.sql
```

### Backup Schedule

| Type | Frequency | Retention |
|------|-----------|-----------|
| Automated | Every 6 hours | 30 days |
| Manual | Daily (recommended) | 90 days |
| Long-term | Weekly | 1 year |

## Recovery Procedures

### Scenario 1: Data Corruption

1. Identify the point in time before corruption occurred
2. Use Cloudflare dashboard to restore from automated backup
3. Verify data integrity
4. Run data validation scripts

```bash
# Restore via Wrangler
npx wrangler d1 restore scratchsolid-db --timestamp=2025-01-07T10:00:00Z
```

### Scenario 2: Accidental Data Deletion

1. Check if data can be recovered from recent backup
2. Restore to point before deletion
3. Re-apply any changes made after the backup point
4. Update affected users

### Scenario 3: Complete Database Failure

1. Create new D1 database instance
2. Import most recent backup
3. Update environment variables
4. Verify application connectivity
5. Monitor for any issues

## Data Retention Enforcement

The system includes automated data retention enforcement:

- **Sessions**: Deleted after 30 days
- **Refresh tokens**: Deleted after 30 days
- **Audit logs**: Archived after 7 years
- **Bookings**: Archived after 7 years
- **Notifications**: Deleted after 90 days

### Running Cleanup Job

```bash
# Create a cron job to run cleanup daily
# This can be scheduled via Cloudflare Workers Cron Triggers
```

## Testing Backups

### Monthly Backup Verification

1. Restore backup to test environment
2. Verify data integrity
3. Run application tests
4. Document results

### Checklist

- [ ] Backup completed successfully
- [ ] Backup file verified
- [ ] Backup stored in secure location
- [ ] Recovery procedure tested
- [ ] Documentation updated

## Emergency Contacts

- Database Administrator: admin@scrapsolidsolutions.co.za
- Cloudflare Support: https://developers.cloudflare.com/support/

## Appendix: Backup Script

```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="scratchsolid-db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Export database
npx wrangler d1 export $DB_NAME --output=$BACKUP_DIR/backup-$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup-$DATE.sql

# Upload to secure storage (configure as needed)
# aws s3 cp $BACKUP_DIR/backup-$DATE.sql.gz s3://backups/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup-$DATE.sql.gz"
```

## Notes

- Always test recovery procedures before they're needed
- Keep backups in multiple locations for redundancy
- Encrypt backups containing sensitive data
- Document any custom backup procedures
- Review and update this document quarterly
