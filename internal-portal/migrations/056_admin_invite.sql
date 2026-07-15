-- Admin invite-by-email flow, plus a pre-existing gap this depends on:
-- lib/db.ts's approveAdminUser/rejectAdminUser/createAdminApprovalRequest
-- already reference admin_approval_status/approved_by/approved_at/
-- approval_notes/registration_ip/registration_user_agent on users, but no
-- migration ever created them - GET /api/admin/users and the admin-approval
-- routes have been throwing "no such column" against production all along.

ALTER TABLE users ADD COLUMN admin_approval_status TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN approved_by INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN approved_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN approval_notes TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN registration_ip TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN registration_user_agent TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_admin_approval_status ON users(admin_approval_status);

-- One row per outstanding (or used/expired) admin invite. Mirrors
-- password_reset_tokens's shape (see auth/forgot-password, auth/reset-password).
CREATE TABLE IF NOT EXISTS admin_invite_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT DEFAULT NULL,
  revoked_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (invited_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_invite_tokens_user ON admin_invite_tokens(user_id);
