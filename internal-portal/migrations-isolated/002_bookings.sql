-- Portal Database Bookings Tables
-- Migration for scratchsolid-portal-db (production)

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  location TEXT NOT NULL,
  service_type TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  booking_time TEXT NOT NULL,
  special_instructions TEXT,
  booking_type TEXT DEFAULT 'standard',
  cleaning_type TEXT DEFAULT 'standard',
  payment_method TEXT DEFAULT 'cash',
  loyalty_discount REAL DEFAULT 0,
  cleaner_id INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
  tracking_token TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cleaner_id) REFERENCES cleaner_profiles(id)
);

-- Booking assignments
CREATE TABLE IF NOT EXISTS booking_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  cleaner_id INTEGER NOT NULL,
  assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER,
  status TEXT DEFAULT 'assigned',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (cleaner_id) REFERENCES cleaner_profiles(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cleaner_id ON bookings(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking_token ON bookings(tracking_token);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking_id ON booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_cleaner_id ON booking_assignments(cleaner_id);
