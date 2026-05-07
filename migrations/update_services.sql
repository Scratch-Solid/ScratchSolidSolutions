-- Migration: Update services table to add missing columns for dynamic services management
-- This migration adds columns to the existing services table

-- Add missing columns to services table
ALTER TABLE services ADD COLUMN duration_hours INTEGER DEFAULT 4;
ALTER TABLE services ADD COLUMN category TEXT DEFAULT 'standard';

-- Create cleaning_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS cleaning_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default cleaning types if they don't exist
INSERT OR IGNORE INTO cleaning_types (name, description) VALUES
  ('Standard', 'Regular cleaning routine'),
  ('Deep', 'Intensive cleaning with attention to detail'),
  ('Move-in/Move-out', 'Empty property cleaning'),
  ('Commercial', 'Business and office cleaning');

-- Create banking_details table for dynamic banking information
CREATE TABLE IF NOT EXISTS banking_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  branch_code TEXT NOT NULL,
  account_type TEXT DEFAULT 'current',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default banking details (placeholder - should be updated via admin)
INSERT OR IGNORE INTO banking_details (bank_name, account_number, account_holder, branch_code) VALUES
  ('First National Bank', 'XXXX XXXX XXXX', 'Scratch Solid Solutions', 'XXXX');
