-- Promo Code Schema Fixes (Audit 2026-07-03)
-- Fixes mismatches between migration 003 and actual code usage

-- 1. Add missing distribution tracking columns to promo_codes
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS distribution_count INTEGER DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS last_distributed_at TEXT DEFAULT NULL;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS distribution_channels TEXT DEFAULT '[]';

-- 2. Fix promo_distribution table to match what the code actually inserts
-- The code inserts: promo_code_id, promo_code, channel, recipient_count, distributed_by, notes
-- But migration 003 defined: promo_code_id, channel, distribution_count, scan_count, conversion_count
-- We need to add the missing columns that the code expects
ALTER TABLE promo_distribution ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT NULL;
ALTER TABLE promo_distribution ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 1;
ALTER TABLE promo_distribution ADD COLUMN IF NOT EXISTS distributed_by TEXT DEFAULT 'admin';
ALTER TABLE promo_distribution ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 3. Fix short_urls: code uses 'clicks' but migration has 'click_count'
-- Add clicks as alias (SQLite doesn't support RENAME COLUMN directly in all versions)
-- We create the correct column if missing
ALTER TABLE short_urls ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- 4. Fix promo_scans table to support both the old schema AND the new usage
-- The code inserts: promo_code_id, promo_code, scan_timestamp
-- Migration defined: short_url_id, scanned_at, ip_address, user_agent
-- Add the columns the code needs
ALTER TABLE promo_scans ADD COLUMN IF NOT EXISTS promo_code_id INTEGER DEFAULT NULL;
ALTER TABLE promo_scans ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT NULL;
ALTER TABLE promo_scans ADD COLUMN IF NOT EXISTS scan_timestamp TEXT DEFAULT NULL;

-- 5. Add promo_code tracking to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount REAL DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_promo_code ON bookings(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_scans_promo_code_id ON promo_scans(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_short_urls_clicks ON short_urls(clicks);
