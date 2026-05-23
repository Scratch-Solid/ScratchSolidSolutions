-- Portal Database Audit Tables
-- Migration for scratchsolid-portal-db (production)

-- Data access audit table
CREATE TABLE IF NOT EXISTS data_access_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  action TEXT NOT NULL, -- 'read', 'write', 'delete', 'export'
  access_granted INTEGER DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Proxy access audit table
CREATE TABLE IF NOT EXISTS proxy_access_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  proxy_type TEXT NOT NULL, -- 'zoho', 'stripe', 'other'
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_payload TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_access_audit_user_id ON data_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_audit_resource ON data_access_audit(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_data_access_audit_action ON data_access_audit(action);
CREATE INDEX IF NOT EXISTS idx_data_access_audit_created_at ON data_access_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_proxy_access_audit_user_id ON proxy_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_access_audit_type ON proxy_access_audit(proxy_type);
CREATE INDEX IF NOT EXISTS idx_proxy_access_audit_created_at ON proxy_access_audit(created_at);
