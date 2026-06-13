-- 053_postgres_fixups.sql
-- PostgreSQL-specific fix-ups after SQLite->Postgres migration.
-- Run after d1-to-postgres.mjs data load on the portal database.

-- ═══════════════════════════════════════════════════════════════════
-- 1. audit_logs: add missing columns that logAuditEvent expects
--    but older migrations didn't define.
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='audit_logs' AND column_name='user_agent') THEN
        ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='audit_logs' AND column_name='success') THEN
        ALTER TABLE audit_logs ADD COLUMN success INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='audit_logs' AND column_name='error_message') THEN
        ALTER TABLE audit_logs ADD COLUMN error_message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='audit_logs' AND column_name='session_id') THEN
        ALTER TABLE audit_logs ADD COLUMN session_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='audit_logs' AND column_name='trace_id') THEN
        ALTER TABLE audit_logs ADD COLUMN trace_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='audit_logs' AND column_name='timestamp') THEN
        ALTER TABLE audit_logs ADD COLUMN timestamp TEXT;
    END IF;
END $$;

-- Ensure a unified index on user_id for both old and new audit_logs rows.
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 2. whatsapp_sessions: add unique constraint on phone_number
--    (expected by session lookup/insert logic).
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_whatsapp_sessions_phone_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_whatsapp_sessions_phone_unique ON whatsapp_sessions(phone_number);
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. users: ensure locked_until column exists (used by incrementFailedAttempts)
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='locked_until') THEN
        ALTER TABLE users ADD COLUMN locked_until TEXT;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. users: ensure failed_attempts column exists
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='failed_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. bookings: ensure cleaner_id and status columns exist
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='bookings' AND column_name='cleaner_id') THEN
        ALTER TABLE bookings ADD COLUMN cleaner_id INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='bookings' AND column_name='status') THEN
        ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='bookings' AND column_name='updated_at') THEN
        ALTER TABLE bookings ADD COLUMN updated_at TEXT;
    END IF;
END $$;
