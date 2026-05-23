-- Migration: Historical Tracking Analytics
-- Add tables for historical GPS tracking data and analytics

CREATE TABLE IF NOT EXISTS gps_tracking_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cleaner_id INTEGER NOT NULL,
  booking_id INTEGER,
  lat REAL NOT NULL,
  long REAL NOT NULL,
  status TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (cleaner_id) REFERENCES users(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS travel_time_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cleaner_id INTEGER NOT NULL,
  from_lat REAL NOT NULL,
  from_long REAL NOT NULL,
  to_lat REAL NOT NULL,
  to_long REAL NOT NULL,
  distance_km REAL NOT NULL,
  time_minutes INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (cleaner_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gps_tracking_history_cleaner_id ON gps_tracking_history(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_history_booking_id ON gps_tracking_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_history_recorded_at ON gps_tracking_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_travel_time_history_cleaner_id ON travel_time_history(cleaner_id);
