-- Portal Database Staff Pool Tables
-- Migration for scratchsolid-portal-db (production)

-- Staff pool transitions table
CREATE TABLE IF NOT EXISTS staff_pool_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  from_pool TEXT NOT NULL, -- 'INDIVIDUAL', 'BUSINESS'
  to_pool TEXT NOT NULL,
  transition_date TEXT NOT NULL,
  reason TEXT,
  approved_by INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_pool_transitions_staff_id ON staff_pool_transitions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_pool_transitions_date ON staff_pool_transitions(transition_date);
CREATE INDEX IF NOT EXISTS idx_staff_pool_transitions_pool ON staff_pool_transitions(from_pool, to_pool);
