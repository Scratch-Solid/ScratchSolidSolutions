-- Migration: Add quote expiration
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/add_quote_expiration.sql

-- Add valid_until column to quote_requests
ALTER TABLE quote_requests ADD COLUMN valid_until TEXT;

-- Update existing quotes to have 30-day validity from creation date
UPDATE quote_requests 
SET valid_until = datetime(created_at, '+30 days')
WHERE valid_until IS NULL;

-- Create index on valid_until for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_quote_requests_valid_until ON quote_requests(valid_until);
