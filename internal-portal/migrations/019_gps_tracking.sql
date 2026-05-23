-- Portal Database GPS Tracking Tables
-- Migration for scratchsolid-portal-db (production)

-- Battery alerts table
CREATE TABLE IF NOT EXISTS battery_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  battery_level INTEGER NOT NULL,
  alert_type TEXT NOT NULL, -- 'low', 'critical'
  location TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GPS tracking history table
CREATE TABLE IF NOT EXISTS gps_tracking_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  booking_id INTEGER,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  altitude REAL,
  speed REAL,
  heading REAL,
  timestamp TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Travel time history table
CREATE TABLE IF NOT EXISTS travel_time_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  booking_id INTEGER NOT NULL,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  distance_km REAL,
  duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  departure_time TEXT NOT NULL,
  arrival_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_battery_alerts_user_id ON battery_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_battery_alerts_created_at ON battery_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_history_user_id ON gps_tracking_history(user_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_history_booking_id ON gps_tracking_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_gps_tracking_history_timestamp ON gps_tracking_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_travel_time_history_user_id ON travel_time_history(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_time_history_booking_id ON travel_time_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_travel_time_history_departure ON travel_time_history(departure_time);
