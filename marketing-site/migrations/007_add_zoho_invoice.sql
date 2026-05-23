-- Migration: Add Zoho invoice ID to quote_requests table
-- Enables invoice tracking and conversion from estimates
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/007_add_zoho_invoice.sql

-- Add Zoho invoice ID to track converted invoices
ALTER TABLE quote_requests ADD COLUMN zoho_invoice_id TEXT DEFAULT '';

-- Create index for Zoho invoice lookups
CREATE INDEX IF NOT EXISTS idx_quote_requests_zoho_invoice_id ON quote_requests(zoho_invoice_id);
