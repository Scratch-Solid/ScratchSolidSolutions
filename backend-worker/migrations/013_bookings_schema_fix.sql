-- 013_bookings_schema_fix.sql
-- Fix bookings table schema to match code usage
-- Code in src/index.js inserts: user_id, booking_type, cleaning_type, payment_method, start_time, end_time
-- Code also expects: zoho_invoice_id, pop_status (from overdue-cancellation.ts)

-- Add columns that code inserts but migration 001 doesn't have
ALTER TABLE bookings ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN booking_type TEXT DEFAULT 'standard';
ALTER TABLE bookings ADD COLUMN cleaning_type TEXT DEFAULT 'standard';
ALTER TABLE bookings ADD COLUMN payment_method TEXT DEFAULT 'cash';
ALTER TABLE bookings ADD COLUMN start_time TEXT DEFAULT '';
ALTER TABLE bookings ADD COLUMN end_time TEXT DEFAULT '';

-- Add cleaner assignment columns (used in hard-delete-accounts.ts)
ALTER TABLE bookings ADD COLUMN cleaner_id INTEGER REFERENCES users(id);

-- Add additional booking details (from portal schema)
ALTER TABLE bookings ADD COLUMN client_name TEXT DEFAULT '';
ALTER TABLE bookings ADD COLUMN location TEXT DEFAULT '';
ALTER TABLE bookings ADD COLUMN special_instructions TEXT DEFAULT '';
ALTER TABLE bookings ADD COLUMN loyalty_discount REAL DEFAULT 0;

-- Add tracking token (already in portal, add to backend for consistency)
ALTER TABLE bookings ADD COLUMN tracking_token TEXT DEFAULT NULL;

-- Add POP and Zoho integration columns (used in overdue-cancellation.ts)
ALTER TABLE bookings ADD COLUMN pop_status TEXT DEFAULT 'not_uploaded';
ALTER TABLE bookings ADD COLUMN pop_reference TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN pop_upload_url TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN pop_verified_at TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN pop_verified_by INTEGER REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN zoho_invoice_id TEXT DEFAULT NULL;

-- Add assignment tracking columns (for consistency with portal)
ALTER TABLE bookings ADD COLUMN assigned_at TEXT DEFAULT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cleaner_id ON bookings(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pop_status ON bookings(pop_status);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking_token ON bookings(tracking_token);
CREATE INDEX IF NOT EXISTS idx_bookings_zoho_invoice ON bookings(zoho_invoice_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
