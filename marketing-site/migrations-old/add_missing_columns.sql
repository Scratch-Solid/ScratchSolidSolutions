-- Add missing columns to existing users table
ALTER TABLE users ADD COLUMN business_info TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN soft_delete_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN deleted INTEGER DEFAULT 0;
