-- 011_payments_table.sql
-- Create payments table with zoho_invoice_id column
-- Payments table doesn't exist in marketing production DB
-- Code in overdue-cancellation.ts and payments/route.ts uses this table

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  booking_id INTEGER REFERENCES bookings(id),
  amount REAL NOT NULL,
  method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending',
  confirmed INTEGER DEFAULT 0,
  zoho_invoice_id TEXT DEFAULT NULL,
  payment_date TEXT DEFAULT NULL,
  external_payment_id TEXT DEFAULT NULL,
  gateway TEXT DEFAULT NULL,
  metadata TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_zoho_invoice_id ON payments(zoho_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
