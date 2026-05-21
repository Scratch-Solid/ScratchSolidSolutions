-- 024_booking_assignments_rebuild.sql
-- Add all missing columns to booking_assignments table
-- Migration 002_bookings.sql created booking_assignments with only 9 columns
-- Code in pool-assignment.ts, bookings/route.ts, whatsapp/route.ts, cleaner-status/route.ts requires additional columns

-- Add missing columns that code uses but migration 002 doesn't have
ALTER TABLE booking_assignments ADD COLUMN staff_id INTEGER REFERENCES users(id);
ALTER TABLE booking_assignments ADD COLUMN assignment_date TEXT DEFAULT NULL;
ALTER TABLE booking_assignments ADD COLUMN time_slot TEXT DEFAULT NULL;
ALTER TABLE booking_assignments ADD COLUMN pool_type TEXT DEFAULT 'INDIVIDUAL';
ALTER TABLE booking_assignments ADD COLUMN service_type TEXT DEFAULT NULL;
ALTER TABLE booking_assignments ADD COLUMN reason TEXT DEFAULT NULL;
ALTER TABLE booking_assignments ADD COLUMN assignment_status TEXT DEFAULT 'assigned';
ALTER TABLE booking_assignments ADD COLUMN completed_at TEXT DEFAULT NULL;
ALTER TABLE booking_assignments ADD COLUMN arrived_at TEXT DEFAULT NULL;
ALTER TABLE booking_assignments ADD COLUMN started_at TEXT DEFAULT NULL;
ALTER TABLE booking_assignments ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- Backfill staff_id from cleaner_id for existing rows
UPDATE booking_assignments SET staff_id = cleaner_id WHERE staff_id IS NULL;
-- Backfill assignment_status from status for existing rows
UPDATE booking_assignments SET assignment_status = status WHERE assignment_status = 'assigned';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_assignments_staff_id ON booking_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_date ON booking_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_slot ON booking_assignments(time_slot);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_pool ON booking_assignments(pool_type);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_status ON booking_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking_id ON booking_assignments(booking_id);
