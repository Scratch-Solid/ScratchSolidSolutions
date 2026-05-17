-- Migration: Add unit_price field to service_pricing table
-- This enables quantity-based pricing (e.g., R100 per additional bedroom)

-- Add unit_price column to service_pricing
ALTER TABLE service_pricing ADD COLUMN unit_price REAL DEFAULT 0;

-- Update existing pricing to include unit prices
-- Standard Clean: R350 base + R100 per bedroom
UPDATE service_pricing SET unit_price = 100.00 WHERE service_id = 1;

-- Deep Clean: R550 base + R150 per bedroom
UPDATE service_pricing SET unit_price = 150.00 WHERE service_id = 2;

-- Move In/Out: R750 base + R200 per bedroom
UPDATE service_pricing SET unit_price = 200.00 WHERE service_id = 3;

-- Post-Construction: R1200 base + R50 per m²
UPDATE service_pricing SET unit_price = 50.00 WHERE service_id = 4;

-- Commercial: R450 base + R20 per m²
UPDATE service_pricing SET unit_price = 20.00 WHERE service_id = 5;
