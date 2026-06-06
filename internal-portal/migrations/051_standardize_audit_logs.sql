-- Standardize audit_logs table columns for unified logAuditEvent signature
-- Adds columns that were missing from the original 007_audit_logs.sql schema

ALTER TABLE audit_logs ADD COLUMN resource TEXT;
ALTER TABLE audit_logs ADD COLUMN success INTEGER DEFAULT 1;
ALTER TABLE audit_logs ADD COLUMN error_message TEXT;
ALTER TABLE audit_logs ADD COLUMN session_id TEXT;
ALTER TABLE audit_logs ADD COLUMN trace_id TEXT;

-- Ensure resource_type stays in sync with resource (backfill)
UPDATE audit_logs SET resource = resource_type WHERE resource IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_audit_logs_trace_id ON audit_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
