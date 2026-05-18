-- Backend Database Migrations & Health Tables
-- Migration for scratchsolid-backend-db (production)

-- Migrations table (track migration execution)
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_name TEXT UNIQUE NOT NULL,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Health checks table (track system health)
CREATE TABLE IF NOT EXISTS health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'healthy', 'unhealthy', 'degraded'
  response_time_ms INTEGER,
  error_message TEXT,
  metadata TEXT, -- JSON metadata
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at);
CREATE INDEX IF NOT EXISTS idx_health_checks_name ON health_checks(check_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON health_checks(checked_at);
