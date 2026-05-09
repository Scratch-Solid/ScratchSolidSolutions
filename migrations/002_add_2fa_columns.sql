-- Phase 2.2: Add 2FA columns to users table
-- This migration adds Two-Factor Authentication support

-- Add 2FA columns to users table
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN backup_codes TEXT;

-- Create indexes for 2FA columns
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON users(totp_enabled);
