-- Data Migration Script
-- This script exports data from the current shared scratchsolid-db and imports into isolated databases
-- Run this after creating the new production databases

-- Step 1: Export data from current scratchsolid-db
-- Run: npx wrangler d1 execute scratchsolid-db --remote --file=./scripts/export-data.sql

-- Step 2: Import data into scratchsolid-portal-db
-- Run: npx wrangler d1 execute scratchsolid-portal-db --remote --file=./scripts/import-portal-data.sql

-- Step 3: Import data into scratchsolid-marketing-db
-- Run: npx wrangler d1 execute scratchsolid-marketing-db --remote --file=./scripts/import-marketing-data.sql

-- Step 4: Import data into scratchsolid-backend-db
-- Run: npx wrangler d1 execute scratchsolid-backend-db --remote --file=./scripts/import-backend-data.sql

-- Note: This is a template script. The actual export/import SQL files need to be generated
-- based on the current database schema and data.
