-- Migration: Add Zoho Books integration fields
-- Enables invoice, payment, and statement tracking via Zoho Books
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/020_add_zoho_fields.sql

-- Add Zoho contact ID to users table for statement/invoice linking
ALTER TABLE users ADD COLUMN zoho_contact_id TEXT DEFAULT '';

-- Add Zoho invoice ID to bookings table for payment tracking
ALTER TABLE bookings ADD COLUMN zoho_invoice_id TEXT DEFAULT '';

-- Add Zoho credit note ID to bookings table for refund tracking
ALTER TABLE bookings ADD COLUMN zoho_credit_note_id TEXT DEFAULT '';

-- Create indexes for Zoho field lookups
CREATE INDEX IF NOT EXISTS idx_users_zoho_contact_id ON users(zoho_contact_id);
CREATE INDEX IF NOT EXISTS idx_bookings_zoho_invoice_id ON bookings(zoho_invoice_id);
CREATE INDEX IF NOT EXISTS idx_bookings_zoho_credit_note_id ON bookings(zoho_credit_note_id);
