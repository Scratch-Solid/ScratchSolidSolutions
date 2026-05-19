-- 026_staff_missing_columns.sql
-- Add missing columns to staff table
-- Migration 022_staff_pool.sql created staff without these columns
-- Code in pool-assignment.ts queries these columns

-- Add missing columns that code uses but migration 022 doesn't have
ALTER TABLE staff ADD COLUMN pool_type TEXT DEFAULT 'INDIVIDUAL';
ALTER TABLE staff ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE staff ADD COLUMN service_type TEXT DEFAULT 'standard';
ALTER TABLE staff ADD COLUMN first_name TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN last_name TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN cellphone TEXT DEFAULT '';
ALTER TABLE staff ADD COLUMN email TEXT DEFAULT '';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_pool_type ON staff(pool_type);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_service_type ON staff(service_type);
