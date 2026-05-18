-- Data Migration Script
-- This script exports data from the current shared scratchsolid-db and imports into isolated databases
-- Run this after creating the new production databases and verifying deployment

-- Database IDs:
-- scratchsolid-db (old shared): b4f175df-...
-- scratchsolid-portal-db: a08f16f5-9d75-47f9-973c-35bade106b47
-- scratchsolid-marketing-db: 4c282c8f-8991-49bd-9dc6-e3eab31a4869
-- scratchsolid-backend-db: 2a0b1e08-443e-46c4-8184-86ea180d4024

-- Step 1: Export data from current scratchsolid-db
-- Run: npx wrangler d1 execute scratchsolid-db --remote --file=./scripts/export-current-data.sql

-- Step 2: Import portal-specific data into scratchsolid-portal-db
-- Run: npx wrangler d1 execute scratchsolid-portal-db --remote --file=./scripts/import-portal-data.sql

-- Step 3: Import marketing-specific data into scratchsolid-marketing-db
-- Run: npx wrangler d1 execute scratchsolid-marketing-db --remote --file=./scripts/import-marketing-data.sql

-- Step 4: Import backend-specific data into scratchsolid-backend-db
-- Run: npx wrangler d1 execute scratchsolid-backend-db --remote --file=./scripts/import-backend-data.sql

-- IMPORTANT: 
-- - Perform this migration during a maintenance window when applications are not in use
-- - Verify all data has been migrated correctly before deleting the old database
-- - Test login functionality on all three applications after migration
-- - Keep a backup of the old database until verification is complete
