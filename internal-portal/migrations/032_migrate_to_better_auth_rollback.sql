-- Rollback Migration 032: Migrate to Better-Auth
-- This script rolls back the Better-Auth migration

-- ============================================
-- Step 1: Restore users table from backup
-- ============================================
DROP TABLE IF EXISTS users;
CREATE TABLE users AS SELECT * FROM users_backup;

-- ============================================
-- Step 2: Drop user_profile table
-- ============================================
DROP TABLE IF EXISTS user_profile;

-- ============================================
-- Step 3: Drop Better-Auth tables
-- ============================================
-- Note: Better-Auth manages its own tables. We'll drop them here.
DROP TABLE IF EXISTS better_auth_accounts;
DROP TABLE IF EXISTS better_auth_sessions;
DROP TABLE IF EXISTS better_auth_users;
DROP TABLE IF EXISTS better_auth_verifications;

-- ============================================
-- Step 4: Drop backup table
-- ============================================
DROP TABLE IF EXISTS users_backup;

-- ============================================
-- Rollback complete
-- ============================================
