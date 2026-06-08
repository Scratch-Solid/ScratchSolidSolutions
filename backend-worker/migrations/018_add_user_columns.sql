-- Add missing columns to users table for backend auth compatibility
ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN address TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN business_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN business_info TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN deleted INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN soft_delete_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN email_verification_token TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN email_verification_expires TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN backup_codes TEXT DEFAULT NULL;
