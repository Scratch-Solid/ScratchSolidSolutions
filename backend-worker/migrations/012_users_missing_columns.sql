-- 012_users_missing_columns.sql
-- Add missing columns to users table that are used in code but not in migration 001
-- Based on baseline documentation, production DB is missing these columns

-- All columns already present in users table (added by earlier migration or manual schema update)
-- ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
-- ALTER TABLE users ADD COLUMN address TEXT DEFAULT '';
-- ALTER TABLE users ADD COLUMN business_name TEXT DEFAULT '';
-- ALTER TABLE users ADD COLUMN business_info TEXT DEFAULT '';
-- ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN deleted INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN soft_delete_at TEXT DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN locked_until TEXT DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 1;
-- ALTER TABLE users ADD COLUMN email_verification_token TEXT DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN email_verification_expires TEXT DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN backup_codes TEXT DEFAULT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted);
CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_soft_delete_at ON users(soft_delete_at);
