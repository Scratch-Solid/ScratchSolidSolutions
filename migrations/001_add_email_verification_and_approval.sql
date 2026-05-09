-- Phase 1.1: Database Schema Changes for Email Verification and Admin Approval
-- This migration adds essential security features for admin signup compliance

-- Add email verification columns to users table
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires TEXT;
ALTER TABLE users ADD COLUMN email_verification_sent_at TEXT;

-- Add admin approval workflow columns
ALTER TABLE users ADD COLUMN admin_approval_status TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN approved_at TEXT;
ALTER TABLE users ADD COLUMN approval_notes TEXT;

-- Add enhanced security tracking columns
ALTER TABLE users ADD COLUMN last_login TEXT;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_failed_login TEXT;
ALTER TABLE users ADD COLUMN registration_ip TEXT;
ALTER TABLE users ADD COLUMN registration_user_agent TEXT;

-- Create comprehensive audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  session_id TEXT,
  trace_id TEXT
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_admin_approval_status ON users(admin_approval_status);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Add level column to roles table for hierarchy
ALTER TABLE roles ADD COLUMN level INTEGER DEFAULT 0;

-- Insert default admin roles for RBAC preparation (Phase 2)
INSERT OR IGNORE INTO roles (name, description, level) VALUES 
  ('super_admin', 'Full system access with all permissions', 100),
  ('admin', 'Administrative access with limited permissions', 80),
  ('moderator', 'Content moderation permissions', 60),
  ('viewer', 'Read-only access to admin features', 40);

-- Insert default permissions for RBAC preparation
INSERT OR IGNORE INTO permissions (name, description, resource, action) VALUES 
  ('admin.create', 'Create new admin users', 'admin', 'create'),
  ('admin.read', 'View admin users', 'admin', 'read'),
  ('admin.update', 'Update admin users', 'admin', 'update'),
  ('admin.delete', 'Delete admin users', 'admin', 'delete'),
  ('admin.approve', 'Approve admin registrations', 'admin', 'approve'),
  ('audit.read', 'View audit logs', 'audit', 'read'),
  ('system.config', 'Modify system configuration', 'system', 'config'),
  ('users.manage', 'Manage user accounts', 'users', 'manage');

-- Assign permissions to super_admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'super_admin';

-- Assign limited permissions to admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'admin' AND p.name IN ('admin.read', 'admin.update', 'audit.read', 'users.manage');

-- Create view for pending admin approvals
CREATE VIEW IF NOT EXISTS pending_admin_approvals AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at,
  u.registration_ip,
  u.admin_approval_status
FROM users u
WHERE u.role IN ('admin', 'super_admin') 
  AND u.admin_approval_status = 'pending'
  AND u.email_verified = 1;

-- Create view for audit log summary
CREATE VIEW IF NOT EXISTS audit_log_summary AS
SELECT 
  COUNT(*) as total_actions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN success = 0 THEN 1 END) as failed_actions,
  DATE(timestamp) as action_date
FROM audit_logs
GROUP BY DATE(timestamp)
ORDER BY action_date DESC;
