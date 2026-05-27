-- Migration 032: Migrate to Better-Auth
-- Migrate users from custom users table to Better-Auth's better_auth_users table
-- This migration preserves user data and integrates with existing RBAC system

-- ============================================
-- Step 1: Backup existing users table
-- ============================================
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- ============================================
-- Step 2: Create better_auth_users table if it doesn't exist
-- Better-Auth will create this automatically, but we'll ensure it exists
-- ============================================
-- Note: Better-Auth creates its own schema. We'll let Better-Auth handle this.

-- ============================================
-- Step 3: Migrate users to better_auth_users
-- This will be done after Better-Auth creates its tables
-- ============================================
-- Insert users from custom users table to better_auth_users
-- Better-Auth schema: id, email, emailVerified, name, image, createdAt, updatedAt
INSERT INTO better_auth_users (id, email, name, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(name, email) as name,
  created_at,
  updated_at
FROM users
WHERE email IS NOT NULL
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  updated_at = excluded.updated_at;

-- ============================================
-- Step 4: Migrate password hashes
-- Better-Auth stores passwords in better_auth_accounts table
-- Note: Better-Auth D1 schema doesn't include password_hash by default
-- We need to add it manually for email/password authentication
-- ============================================
-- Add password_hash column to better_auth_accounts
ALTER TABLE better_auth_accounts ADD COLUMN password_hash TEXT;

-- Insert accounts with password hashes
INSERT INTO better_auth_accounts (id, account_id, provider_id, user_id, password_hash, created_at, updated_at)
SELECT 
  u.id,
  u.email as account_id,
  'credential' as provider_id,
  u.id as user_id,
  u.password_hash as passwordHash,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.password_hash IS NOT NULL
  AND u.email IS NOT NULL
ON CONFLICT(user_id, account_id) DO UPDATE SET
  password_hash = excluded.password_hash,
  updated_at = excluded.updated_at;

-- ============================================
-- Step 5: Add custom fields to better_auth_users
-- Better-Auth doesn't have these fields by default, so we'll keep them in a separate table
-- ============================================
-- Create user_profile table for custom fields
CREATE TABLE IF NOT EXISTS user_profile (
  user_id INTEGER PRIMARY KEY,
  paysheet_code TEXT,
  phone TEXT,
  role TEXT,
  is_superuser INTEGER NOT NULL DEFAULT 0,
  default_role_id INTEGER,
  rbac_version INTEGER NOT NULL DEFAULT 1,
  password_needs_reset INTEGER NOT NULL DEFAULT 0,
  login_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES better_auth_users(id) ON DELETE CASCADE,
  FOREIGN KEY (default_role_id) REFERENCES roles(id)
);

-- Migrate custom fields to user_profile
INSERT INTO user_profile (user_id, paysheet_code, phone, role, is_superuser, default_role_id, rbac_version, password_needs_reset, login_count)
SELECT 
  id,
  paysheet_code,
  phone,
  role,
  is_superuser,
  default_role_id,
  rbac_version,
  password_needs_reset,
  login_count
FROM users
ON CONFLICT(user_id) DO UPDATE SET
  paysheet_code = excluded.paysheet_code,
  phone = excluded.phone,
  role = excluded.role,
  is_superuser = excluded.is_superuser,
  default_role_id = excluded.default_role_id,
  rbac_version = excluded.rbac_version,
  password_needs_reset = excluded.password_needs_reset,
  login_count = excluded.login_count;

-- ============================================
-- Step 6: Update RBAC user_roles to reference better_auth_users
-- ============================================
-- The user_roles table already references users.id, which is now better_auth_users.id
-- No changes needed as the IDs are the same

-- ============================================
-- Migration complete
-- ============================================
-- Note: The old users table is kept as users_backup for rollback
-- After verification, the users table can be dropped or renamed
