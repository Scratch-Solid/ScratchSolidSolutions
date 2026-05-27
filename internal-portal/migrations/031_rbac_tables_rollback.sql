-- Rollback Migration 031: RBAC Tables
-- This script rolls back the RBAC tables migration
-- WARNING: This will delete all RBAC data and cannot be undone

-- ============================================
-- Drop RBAC-related indexes from sessions table
-- ============================================
DROP INDEX IF EXISTS idx_sessions_ip_address;
DROP INDEX IF EXISTS idx_sessions_device_fingerprint;
DROP INDEX IF EXISTS idx_sessions_is_revoked;

-- ============================================
-- Drop RBAC-related columns from sessions table
-- ============================================
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- For now, we'll leave the columns in place (they won't be used)
-- If you need to remove them, you'll need to recreate the sessions table

-- ============================================
-- Drop RBAC-related indexes from users table
-- ============================================
DROP INDEX IF EXISTS idx_users_default_role_id;
DROP INDEX IF EXISTS idx_users_is_superuser;

-- ============================================
-- Drop RBAC-related columns from users table
-- ============================================
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- For now, we'll leave the columns in place (they won't be used)
-- If you need to remove them, you'll need to recreate the users table

-- ============================================
-- Drop consent_records table
-- ============================================
DROP INDEX IF EXISTS idx_consent_records_consent_given;
DROP INDEX IF EXISTS idx_consent_records_consent_type;
DROP INDEX IF EXISTS idx_consent_records_user_id;
DROP TABLE IF EXISTS consent_records;

-- ============================================
-- Drop failed_login_attempts table
-- ============================================
DROP INDEX IF EXISTS idx_failed_login_attempts_attempted_at;
DROP INDEX IF EXISTS idx_failed_login_attempts_ip_address;
DROP INDEX IF EXISTS idx_failed_login_attempts_identifier;
DROP TABLE IF EXISTS failed_login_attempts;

-- ============================================
-- Drop rbac_audit_log table
-- ============================================
DROP INDEX IF EXISTS idx_rbac_audit_log_trace_id;
DROP INDEX IF EXISTS idx_rbac_audit_log_resource_id;
DROP INDEX IF EXISTS idx_rbac_audit_log_resource_type;
DROP INDEX IF EXISTS idx_rbac_audit_log_action;
DROP INDEX IF EXISTS idx_rbac_audit_log_target_user_id;
DROP INDEX IF EXISTS idx_rbac_audit_log_user_id;
DROP INDEX IF EXISTS idx_rbac_audit_log_timestamp;
DROP TABLE IF EXISTS rbac_audit_log;

-- ============================================
-- Drop permission_denials table
-- ============================================
DROP INDEX IF EXISTS idx_permission_denials_is_active;
DROP INDEX IF EXISTS idx_permission_denials_permission_id;
DROP INDEX IF EXISTS idx_permission_denials_user_id;
DROP TABLE IF EXISTS permission_denials;

-- ============================================
-- Drop user_roles table
-- ============================================
DROP INDEX IF EXISTS idx_user_roles_expires_at;
DROP INDEX IF EXISTS idx_user_roles_is_active;
DROP INDEX IF EXISTS idx_user_roles_role_id;
DROP INDEX IF EXISTS idx_user_roles_user_id;
DROP TABLE IF EXISTS user_roles;

-- ============================================
-- Drop role_permissions table
-- ============================================
DROP INDEX IF EXISTS idx_role_permissions_is_active;
DROP INDEX IF EXISTS idx_role_permissions_permission_id;
DROP INDEX IF EXISTS idx_role_permissions_role_id;
DROP TABLE IF EXISTS role_permissions;

-- ============================================
-- Drop permissions table
-- ============================================
DROP INDEX IF EXISTS idx_permissions_name;
DROP INDEX IF EXISTS idx_permissions_category;
DROP INDEX IF EXISTS idx_permissions_action;
DROP INDEX IF EXISTS idx_permissions_resource;
DROP TABLE IF EXISTS permissions;

-- ============================================
-- Drop roles table
-- ============================================
DROP INDEX IF EXISTS idx_roles_name;
DROP INDEX IF EXISTS idx_roles_level;
DROP TABLE IF EXISTS roles;

-- ============================================
-- Rollback complete
-- ============================================
-- Note: The users and sessions tables still have RBAC columns added by the migration
-- These columns are harmless but can be removed by recreating the tables if needed
