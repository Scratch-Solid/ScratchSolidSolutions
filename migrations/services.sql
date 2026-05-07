-- Migration: Create dynamic services management system
-- This allows services to be managed via admin dashboard instead of hardcoded

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  base_price REAL NOT NULL,
  duration_hours INTEGER DEFAULT 4,
  category TEXT DEFAULT 'standard', -- standard, deep, commercial, specialized
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create cleaning_types table
CREATE TABLE IF NOT EXISTS cleaning_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default services
INSERT INTO services (name, description, base_price, duration_hours, category) VALUES
  ('Standard Cleaning', 'Regular cleaning service for homes', 450.00, 4, 'standard'),
  ('Deep Clean', 'Thorough cleaning including hard-to-reach areas', 650.00, 6, 'deep'),
  ('Move-in/Move-out Cleaning', 'Comprehensive cleaning for moving in or out', 700.00, 6, 'specialized'),
  ('Commercial Cleaning', 'Professional cleaning for business premises', 800.00, 4, 'commercial');

-- Insert default cleaning types
INSERT INTO cleaning_types (name, description) VALUES
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
  account_type TEXT DEFAULT 'current', -- current, savings
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default banking details (placeholder - should be updated via admin)
INSERT INTO banking_details (bank_name, account_number, account_holder, branch_code) VALUES
  ('First National Bank', 'XXXX XXXX XXXX', 'Scratch Solid Solutions', 'XXXX');
