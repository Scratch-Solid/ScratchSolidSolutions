-- Data Retention Enforcement
-- This migration adds indexes for efficient data cleanup queries

-- Add index on sessions for cleanup by created_at
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Add index on refresh_tokens for cleanup by created_at
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_created_at ON refresh_tokens(created_at);

-- Add index on audit_logs for cleanup by created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Add index on bookings for cleanup by created_at
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
