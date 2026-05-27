-- Rollback Migration 033: Migrate Sessions to Better-Auth
-- This script rolls back the session migration

-- ============================================
-- Step 1: Restore sessions table from backup
-- ============================================
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions AS SELECT * FROM sessions_backup;

-- ============================================
-- Step 2: Drop Better-Auth sessions table
-- ============================================
-- Note: Better-Auth manages its own tables. We'll drop it here.
DROP TABLE IF EXISTS better_auth_sessions;

-- ============================================
-- Step 3: Drop backup table
-- ============================================
DROP TABLE IF EXISTS sessions_backup;

-- ============================================
-- Rollback complete
-- ============================================
