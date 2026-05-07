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

CREATE INDEX IF NOT EXISTS idx_payroll_cleaner_id ON payroll(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
