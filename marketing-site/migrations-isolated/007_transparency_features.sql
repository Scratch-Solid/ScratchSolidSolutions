-- Marketing Database Transparency Features Tables
-- Migration for scratchsolid-marketing-db (production)

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  latitude REAL,
  longitude REAL,
  service_radius REAL, -- in kilometers
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Cleaner photos table (marketing-specific - public photos)
CREATE TABLE IF NOT EXISTS cleaner_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cleaner_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  is_verified INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cleaner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Client feedback table (marketing-specific)
CREATE TABLE IF NOT EXISTS client_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  booking_id INTEGER,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Cleaning checklist table (marketing-specific)
CREATE TABLE IF NOT EXISTS cleaning_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  checklist_type TEXT NOT NULL,
  total_items INTEGER NOT NULL,
  completed_items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Geofences table
CREATE TABLE IF NOT EXISTS geofences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  fence_data TEXT NOT NULL, -- JSON or polygon data
  fence_type TEXT DEFAULT 'polygon', -- 'circle', 'polygon'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Client preferences table (marketing-specific)
CREATE TABLE IF NOT EXISTS client_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  preferred_cleaner_id INTEGER,
  preferred_time_slot TEXT,
  special_instructions TEXT,
  access_instructions TEXT,
  pet_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (preferred_cleaner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_cleaner_photos_cleaner_id ON cleaner_photos(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_user_id ON client_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_booking_id ON client_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_public ON client_feedback(is_public);
CREATE INDEX IF NOT EXISTS idx_cleaning_checklist_booking_id ON cleaning_checklist(booking_id);
CREATE INDEX IF NOT EXISTS idx_geofences_is_active ON geofences(is_active);
CREATE INDEX IF NOT EXISTS idx_client_preferences_user_id ON client_preferences(user_id);
