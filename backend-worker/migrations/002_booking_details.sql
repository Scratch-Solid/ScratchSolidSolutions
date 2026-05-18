-- Backend Database Booking Details Tables
-- Migration for scratchsolid-backend-db (production)

-- Booking services table
CREATE TABLE IF NOT EXISTS booking_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Booking status history table
CREATE TABLE IF NOT EXISTS booking_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  previous_status TEXT,
  changed_by INTEGER,
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_status ON booking_status_history(status);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_changed_at ON booking_status_history(changed_at);
