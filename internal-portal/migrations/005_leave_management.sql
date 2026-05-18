-- Portal Database Leave Management Tables
-- Migration for scratchsolid-portal-db (production)

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'sick', 'vacation', 'personal', 'other'
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days REAL NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  approved_by INTEGER,
  approved_at TEXT,
  rejection_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL,
  total_days REAL NOT NULL,
  used_days REAL DEFAULT 0,
  remaining_days REAL NOT NULL,
  year INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, leave_type, year)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);
