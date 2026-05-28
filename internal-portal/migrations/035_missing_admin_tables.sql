-- Migration 035: Missing Admin Tables
-- Creates tables for contracts, payments, services, and banking_details
-- These tables are referenced by admin API endpoints but were missing from migrations

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER,
  client_id INTEGER,
  contract_type TEXT DEFAULT 'standard',
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  terms TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES users(id)
);

-- Payments table (for payroll/admin payments)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  cleaner_id INTEGER,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_date TEXT,
  period_start TEXT,
  period_end TEXT,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (cleaner_id) REFERENCES cleaner_profiles(id)
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  base_price REAL NOT NULL,
  duration_hours REAL DEFAULT 4,
  category TEXT DEFAULT 'standard',
  is_active INTEGER DEFAULT 1,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Banking details table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_business_id ON contracts(business_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_cleaner_id ON payments(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_banking_details_is_active ON banking_details(is_active);

-- Seed default services if table is empty
INSERT OR IGNORE INTO services (name, description, base_price, duration_hours, category, is_active, display_order) VALUES
('Standard Clean', 'Regular cleaning service', 350, 4, 'standard', 1, 1),
('Deep Clean', 'Deep cleaning service', 500, 6, 'standard', 1, 2),
('Office Clean', 'Office cleaning service', 400, 4, 'commercial', 1, 3),
('Move-in/Move-out', 'Move-in or move-out cleaning', 600, 8, 'special', 1, 4);
