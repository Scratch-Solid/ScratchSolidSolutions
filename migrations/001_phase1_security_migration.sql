-- Phase 1.1: Targeted Security Migration for Existing Database
-- This migration adds security features to existing database without breaking data

-- Create roles table (if not exists)
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  level INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create permissions table (if not exists)
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create role_permissions table (if not exists)
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(role_id, permission_id)
);

-- Add email verification columns to users table (if not exist)
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires TEXT;
ALTER TABLE users ADD COLUMN email_verification_sent_at TEXT;

-- Add admin approval workflow columns (if not exist)
ALTER TABLE users ADD COLUMN admin_approval_status TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN approved_at TEXT;
ALTER TABLE users ADD COLUMN approval_notes TEXT;

-- Add enhanced security tracking columns (if not exist)
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

-- Insert default admin roles
INSERT OR IGNORE INTO roles (name, description, level) VALUES 
  ('super_admin', 'Full system access with all permissions', 100),
  ('admin', 'Administrative access with limited permissions', 80),
  ('moderator', 'Content moderation permissions', 60),
  ('viewer', 'Read-only access to admin features', 40);

-- Insert default permissions
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

-- Update existing admin users to be approved (for existing data)
UPDATE users 
SET admin_approval_status = 'approved', approved_at = datetime('now'), email_verified = 1
WHERE role IN ('admin', 'super_admin') AND admin_approval_status = 'pending';
