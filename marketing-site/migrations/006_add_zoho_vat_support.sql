-- Migration: Add Zoho estimate and VAT support to quote_requests table
-- Enables professional tax invoice generation via Zoho Books
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/006_add_zoho_vat_support.sql

-- Add Zoho estimate tracking fields
ALTER TABLE quote_requests ADD COLUMN zoho_estimate_id TEXT DEFAULT '';
ALTER TABLE quote_requests ADD COLUMN zoho_estimate_number TEXT DEFAULT '';

-- Add VAT registration fields for business users
ALTER TABLE quote_requests ADD COLUMN vat_registered INTEGER DEFAULT 0;
ALTER TABLE quote_requests ADD COLUMN vat_number TEXT DEFAULT '';

-- Create index for Zoho estimate lookups
CREATE INDEX IF NOT EXISTS idx_quote_requests_zoho_estimate_id ON quote_requests(zoho_estimate_id);
