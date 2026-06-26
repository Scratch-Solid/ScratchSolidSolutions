-- Migration 017: Add cleaner_id to bookings table for post-payment cleaner assignment
-- This column is required by assignBookingToCleaner and getBookingsByCleaner in lib/db.ts

ALTER TABLE bookings ADD COLUMN cleaner_id INTEGER DEFAULT NULL;

-- Update index for cleaner lookups
CREATE INDEX IF NOT EXISTS idx_bookings_cleaner_id ON bookings(cleaner_id);
