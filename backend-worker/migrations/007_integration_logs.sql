-- Backend Database Integration Logs Tables
-- Migration for scratchsolid-backend-db (production)

-- Integration logs table
CREATE TABLE IF NOT EXISTS integration_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  integration_type TEXT NOT NULL, -- 'zoho', 'stripe', 'resend', 'custom'
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'sync'
  resource_type TEXT NOT NULL, -- 'invoice', 'customer', 'payment', 'contact'
  resource_id TEXT,
  request_payload TEXT, -- JSON request
  response_payload TEXT, -- JSON response
  status TEXT DEFAULT 'success', -- 'success', 'error', 'retry'
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_logs_type ON integration_logs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_logs_action ON integration_logs(action);
CREATE INDEX IF NOT EXISTS idx_integration_logs_resource ON integration_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at);
