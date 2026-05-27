-- Migration 033: Migrate Sessions to Better-Auth
-- Migrate sessions from custom sessions table to Better-Auth's better_auth_sessions table

-- ============================================
-- Step 1: Backup existing sessions table
-- ============================================
CREATE TABLE IF NOT EXISTS sessions_backup AS SELECT * FROM sessions;

-- ============================================
-- Step 2: Migrate sessions to better_auth_sessions
-- Better-Auth schema: id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt
-- ============================================
INSERT INTO better_auth_sessions (id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt)
SELECT 
  id,
  user_id as userId,
  token,
  expires_at as expiresAt,
  ip_address as ipAddress,
  user_agent as userAgent,
  created_at as createdAt,
  updated_at as updatedAt
FROM sessions
WHERE user_id IS NOT NULL
  AND token IS NOT NULL
ON CONFLICT(id) DO UPDATE SET
  userId = excluded.userId,
  token = excluded.token,
  expiresAt = excluded.expiresAt,
  ipAddress = excluded.ipAddress,
  userAgent = excluded.userAgent,
  updatedAt = excluded.updatedAt;

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
