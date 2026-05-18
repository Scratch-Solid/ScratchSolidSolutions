-- Migration: Battery Level Alerts
-- Add battery_level column to cleaner_profiles and battery_alerts table

ALTER TABLE cleaner_profiles ADD COLUMN battery_level INTEGER DEFAULT 100;
ALTER TABLE cleaner_profiles ADD COLUMN last_battery_check TEXT;

CREATE TABLE IF NOT EXISTS battery_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cleaner_id INTEGER NOT NULL,
  battery_level INTEGER NOT NULL,
  alert_type TEXT NOT NULL, -- 'low', 'critical'
  sent_at TEXT NOT NULL,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_at TEXT,
  FOREIGN KEY (cleaner_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_battery_alerts_cleaner_id ON battery_alerts(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_battery_alerts_sent_at ON battery_alerts(sent_at);
