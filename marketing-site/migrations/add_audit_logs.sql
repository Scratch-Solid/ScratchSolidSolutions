-- Migration: Add columns to existing audit_logs table for quote system audit logging
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/add_audit_logs.sql

-- Add user_email column (for non-admin users)
ALTER TABLE audit_logs ADD COLUMN user_email TEXT;

-- Add user_role column
ALTER TABLE audit_logs ADD COLUMN user_role TEXT;

-- Add metadata column for additional context
ALTER TABLE audit_logs ADD COLUMN metadata TEXT;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
