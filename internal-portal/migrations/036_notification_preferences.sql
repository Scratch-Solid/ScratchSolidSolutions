-- Add notification preferences to users table
ALTER TABLE users ADD COLUMN notification_preferences TEXT DEFAULT '{"whatsapp": true, "email": true}';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_notification_preferences ON users(notification_preferences);
