-- The POST/GET /api/data-deletion handlers have referenced this table since
-- they were added, but no marketing-site migration ever created it (it exists
-- in internal-portal's separate D1 database under the same name, which is a
-- different table on a different database - see internal-portal/migrations/
-- 021_popia_compliance.sql). Every call to POST /api/data-deletion has been
-- failing with "no such table" until now.
--
-- Also adds the columns needed for the unauthenticated request flow: a
-- visitor who isn't logged in submits an email + reason, we email a
-- confirmation link (same pattern as password_reset_tokens /
-- forgot-password), and the request only becomes 'pending' once confirmed -
-- this stops someone from filing deletion requests against emails they don't
-- own.
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'unconfirmed', 'pending', 'completed', 'rejected'
  confirmation_token TEXT,
  confirmation_expires_at TEXT,
  confirmed_at TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_deletion_requests_token ON data_deletion_requests(confirmation_token);
