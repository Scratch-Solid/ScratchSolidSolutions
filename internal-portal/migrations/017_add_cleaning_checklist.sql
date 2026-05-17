-- Migration: Cleaning Checklist
-- Add tables for cleaning checklists and checklist items

CREATE TABLE IF NOT EXISTS cleaning_checklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE,
  cleaner_id INTEGER NOT NULL,
  service_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (cleaner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL, -- 'general', 'kitchen', 'bathroom', 'living_room', 'bedroom'
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  notes TEXT,
  FOREIGN KEY (checklist_id) REFERENCES cleaning_checklists(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cleaning_checklists_booking_id ON cleaning_checklists(booking_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_checklists_cleaner_id ON cleaning_checklists(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
