-- Add paysheet_code and department columns to users table
-- Migration for cleaner signup functionality

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- These commands will fail if columns already exist, which is fine
ALTER TABLE users ADD COLUMN paysheet_code TEXT;
ALTER TABLE users ADD COLUMN department TEXT;
ALTER TABLE users ADD COLUMN password_needs_reset INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN username TEXT;
