-- password_reset_tokens is missing used_at in production/staging, despite
-- reset-password/route.ts selecting and updating it on every request -
-- every real reset attempt has been throwing "no such column: used_at"
-- since this table was created (see auth/forgot-password, auth/reset-password).
ALTER TABLE password_reset_tokens ADD COLUMN used_at TEXT DEFAULT NULL;
