-- Add email verification columns to users table
-- Default 1 so existing users are not locked out (grandfathered as verified)
-- New users created after this migration will have email_verified set to 0 explicitly by the app
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TEXT;
