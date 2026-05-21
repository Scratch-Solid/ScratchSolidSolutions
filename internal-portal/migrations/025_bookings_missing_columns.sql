-- 025_bookings_missing_columns.sql
-- Add missing columns to bookings table
-- Migration 002_bookings.sql created bookings without these columns
-- Code in pool-assignment.ts and bookings/route.ts uses these columns

-- Add missing columns that code uses but migration 002 doesn't have
ALTER TABLE bookings ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN time_slot TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN pool_type TEXT DEFAULT 'INDIVIDUAL';
ALTER TABLE bookings ADD COLUMN assignment_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN assigned_staff_id INTEGER REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN assigned_at TEXT DEFAULT NULL;

-- Backfill user_id from client_id for existing rows
UPDATE bookings SET user_id = client_id WHERE user_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot ON bookings(time_slot);
CREATE INDEX IF NOT EXISTS idx_bookings_pool_type ON bookings(pool_type);
CREATE INDEX IF NOT EXISTS idx_bookings_assignment_status ON bookings(assignment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_staff_id ON bookings(assigned_staff_id);
