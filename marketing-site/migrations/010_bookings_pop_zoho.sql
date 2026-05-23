-- 010_bookings_pop_zoho.sql
-- Add POP and Zoho columns to bookings table
-- Code in pop-verification/route.ts uses these columns but they don't exist in any marketing migration

-- Add POP verification columns
ALTER TABLE bookings ADD COLUMN pop_status TEXT DEFAULT 'not_uploaded';
ALTER TABLE bookings ADD COLUMN pop_reference TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN pop_upload_url TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN pop_verified_at TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN pop_verified_by INTEGER REFERENCES users(id);

-- Add Zoho integration column
ALTER TABLE bookings ADD COLUMN zoho_invoice_id TEXT DEFAULT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_pop_status ON bookings(pop_status);
CREATE INDEX IF NOT EXISTS idx_bookings_zoho_invoice_id ON bookings(zoho_invoice_id);
