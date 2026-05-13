-- Add client_type column to quote_requests table
-- This column is required by the quote creation API

ALTER TABLE quote_requests ADD COLUMN client_type TEXT DEFAULT 'individual';
