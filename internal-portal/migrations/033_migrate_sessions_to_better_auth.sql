-- Migration 033: Migrate Sessions to Better-Auth
-- Migrate sessions from custom sessions table to Better-Auth's better_auth_sessions table

-- ============================================
-- Step 1: Backup existing sessions table
-- ============================================
CREATE TABLE IF NOT EXISTS sessions_backup AS SELECT * FROM sessions;

-- ============================================
-- Step 2: Migrate sessions to better_auth_sessions
-- Better-Auth schema: id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt
-- Note: Better-Auth uses snake_case in D1: user_id, expires_at, ip_address, user_agent, created_at, updated_at
-- ============================================
INSERT INTO better_auth_sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at, updated_at)
SELECT 
  id,
  user_id,
  token,
  expires_at,
  ip_address,
  user_agent,
  created_at,
  updated_at
FROM sessions
WHERE user_id IS NOT NULL
  AND token IS NOT NULL
ON CONFLICT(id) DO UPDATE SET
  user_id = excluded.user_id,
  token = excluded.token,
  expires_at = excluded.expires_at,
  ip_address = excluded.ip_address,
  user_agent = excluded.user_agent,
  updated_at = excluded.updated_at;

-- ============================================
-- Step 3: Migrate session activity logs
-- Better-Auth doesn't have session activity logs by default
-- We'll keep them in the existing session_activity table
-- No migration needed - session_activity table remains as is

-- ============================================
-- Migration complete
-- ============================================
-- Note: The old sessions table is kept as sessions_backup for rollback
-- After verification, the sessions table can be dropped or renamed
