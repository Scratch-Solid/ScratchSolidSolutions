-- Portal Database Payroll Tables
-- Migration for scratchsolid-portal-db (production)

-- Payroll table
CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cleaner_id INTEGER NOT NULL,
  paysheet_code TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  hours_worked REAL DEFAULT 0,
  hourly_rate REAL NOT NULL,
  gross_pay REAL NOT NULL,
  deductions REAL DEFAULT 0,
  net_pay REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'paid'
  processed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cleaner_id) REFERENCES cleaner_profiles(id)
);

-- Payroll adjustments
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payroll_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'bonus', 'deduction', 'overtime'
  amount REAL NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payroll_id) REFERENCES payroll(id) ON DELETE CASCADE
);

-- Payroll periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period_start TEXT NOT NULL UNIQUE,
  period_end TEXT NOT NULL UNIQUE,
  is_closed INTEGER DEFAULT 0,
  closed_at TEXT,
  closed_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (closed_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payroll_cleaner_id ON payroll(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_payroll_id ON payroll_adjustments(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_period_start ON payroll_periods(period_start);
