-- Portal Database Schedules Tables
-- Migration for scratchsolid-portal-db (production)

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  shift_pattern TEXT, -- JSON pattern for shifts
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Schedule assignments
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  assigned_date TEXT NOT NULL,
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'missed', 'cancelled'
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_schedules_dates ON schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_id ON schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_user_id ON schedule_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_date ON schedule_assignments(assigned_date);
