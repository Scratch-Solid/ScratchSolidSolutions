-- Migration: Pricing tiers (individual vs business) + seasonal specials
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/add_pricing_tiers.sql

-- Add client_type to service_pricing so admin can set different prices per account type
ALTER TABLE service_pricing ADD COLUMN client_type TEXT DEFAULT 'all';
  -- values: 'individual', 'business', 'all'

-- Add special/seasonal pricing columns (admin-controlled, no promo code needed)
ALTER TABLE service_pricing ADD COLUMN special_price REAL DEFAULT NULL;
ALTER TABLE service_pricing ADD COLUMN special_label TEXT DEFAULT '';
  -- e.g. "May Special"
ALTER TABLE service_pricing ADD COLUMN special_valid_from TEXT DEFAULT NULL;
  -- ISO datetime, NULL = always active once special_price is set
ALTER TABLE service_pricing ADD COLUMN special_valid_until TEXT DEFAULT NULL;
  -- ISO datetime, NULL = no expiry

-- Add client_type to quote_requests so admin can see what type requested
ALTER TABLE quote_requests ADD COLUMN client_type TEXT DEFAULT 'individual';

-- Index for client_type queries
CREATE INDEX IF NOT EXISTS idx_service_pricing_client_type ON service_pricing(service_id, client_type);

-- ─── Seed individual pricing (as provided) ─────────────────────────────────
-- NOTE: Run this AFTER your services rows exist with the correct IDs.
-- Adjust service_id values to match your actual services table entries.
-- These are reference INSERT statements — update service_id to match your DB.

-- Standard Clean: R450 base, R350 May special
-- INSERT INTO service_pricing (service_id, client_type, price, special_price, special_label, special_valid_from, special_valid_until, unit)
--   VALUES (1, 'individual', 450, 350, 'May Special', '2025-05-01T00:00:00', '2025-05-31T23:59:59', 'per clean');

-- Deep Clean: R800
-- INSERT INTO service_pricing (service_id, client_type, price, unit)
--   VALUES (2, 'individual', 800, 'per clean');

-- Move In / Move Out: R500
-- INSERT INTO service_pricing (service_id, client_type, price, unit)
--   VALUES (3, 'individual', 500, 'per clean');
