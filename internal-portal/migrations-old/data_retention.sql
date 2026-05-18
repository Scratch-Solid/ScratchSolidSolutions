-- Data Retention Enforcement
-- This migration adds indexes for efficient data cleanup queries

-- Data retention indexes
-- These indexes optimize cleanup queries for data retention policies

-- Sessions table indexes (for 30-day retention)
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Refresh tokens table indexes (for 30-day retention)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_created_at ON refresh_tokens(created_at);

-- Audit logs table indexes (for 7-year retention)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Bookings table indexes (for 7-year retention)
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
