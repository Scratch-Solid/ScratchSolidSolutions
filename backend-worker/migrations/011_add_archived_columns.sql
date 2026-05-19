-- Add archived columns to existing tables for data retention
-- These columns are needed by data-retention.js

-- Add archived columns to bookings table
ALTER TABLE bookings ADD COLUMN archived INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN archived_at TEXT;

-- Add archived columns to audit_logs table (if not already added)
ALTER TABLE audit_logs ADD COLUMN archived INTEGER DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN archived_at TEXT;

-- Create refresh_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_archived ON bookings(archived);
CREATE INDEX IF NOT EXISTS idx_audit_logs_archived ON audit_logs(archived);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
