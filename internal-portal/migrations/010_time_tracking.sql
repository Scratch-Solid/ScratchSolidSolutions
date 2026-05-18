-- Portal Database Time Tracking Tables
-- Migration for scratchsolid-portal-db (production)

-- Time tracking table
CREATE TABLE IF NOT EXISTS time_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  clock_in TEXT NOT NULL,
  clock_out TEXT,
  break_duration INTEGER DEFAULT 0, -- in minutes
  total_hours REAL,
  notes TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'missed'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Time off requests
CREATE TABLE IF NOT EXISTS time_off_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'sick', 'vacation', 'personal', 'bereavement', 'other'
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  hours REAL NOT NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_time_tracking_user_id ON time_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_date ON time_tracking(date);
CREATE INDEX IF NOT EXISTS idx_time_tracking_status ON time_tracking(status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_user_id ON time_off_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_dates ON time_off_requests(start_date, end_date);
