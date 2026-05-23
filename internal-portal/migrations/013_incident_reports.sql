-- Portal Database Incident Reports Table
-- Migration for scratchsolid-portal-db (production)

-- Incident reports table
CREATE TABLE IF NOT EXISTS incident_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reported_by INTEGER NOT NULL,
  incident_type TEXT NOT NULL, -- 'accident', 'injury', 'property_damage', 'theft', 'other'
  description TEXT NOT NULL,
  location TEXT,
  incident_date TEXT NOT NULL,
  severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'closed'
  involved_parties TEXT, -- JSON array of user IDs
  witness_statements TEXT, -- JSON array
  actions_taken TEXT,
  resolution TEXT,
  resolved_by INTEGER,
  resolved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_incident_reports_reported_by ON incident_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_incident_reports_type ON incident_reports(incident_type);
CREATE INDEX IF NOT EXISTS idx_incident_reports_date ON incident_reports(incident_date);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_severity ON incident_reports(severity);
