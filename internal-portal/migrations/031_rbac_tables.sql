-- Migration 031: RBAC Tables
-- Create Role-Based Access Control tables with audit trails
-- This migration adds comprehensive RBAC functionality to the system

-- ============================================
-- Table: roles
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER,
  updated_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- ============================================
-- Table: permissions
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER,
  updated_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);

-- ============================================
-- Table: role_permissions
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  granted_by INTEGER,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_is_active ON role_permissions(is_active);

-- ============================================
-- Table: user_roles
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  assigned_by INTEGER,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  context TEXT,
  UNIQUE(user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON user_roles(expires_at);

-- ============================================
-- Table: permission_denials
-- ============================================
CREATE TABLE IF NOT EXISTS permission_denials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  denied_at TEXT NOT NULL DEFAULT (datetime('now')),
  denied_by INTEGER,
  reason TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (denied_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_permission_denials_user_id ON permission_denials(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_denials_permission_id ON permission_denials(permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_denials_is_active ON permission_denials(is_active);

-- ============================================
-- Table: rbac_audit_log
-- ============================================
CREATE TABLE IF NOT EXISTS rbac_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  user_id INTEGER,
  target_user_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  trace_id TEXT,
  session_id TEXT,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (target_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_timestamp ON rbac_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_user_id ON rbac_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_target_user_id ON rbac_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_action ON rbac_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_resource_type ON rbac_audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_resource_id ON rbac_audit_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_trace_id ON rbac_audit_log(trace_id);

-- ============================================
-- Table: failed_login_attempts
-- ============================================
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_identifier ON failed_login_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip_address ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_attempted_at ON failed_login_attempts(attempted_at);

-- ============================================
-- Table: consent_records
-- ============================================
CREATE TABLE IF NOT EXISTS consent_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL,
  consent_given INTEGER NOT NULL,
  consented_at TEXT NOT NULL DEFAULT (datetime('now')),
  consent_version TEXT NOT NULL,
  consent_text TEXT,
  ip_address TEXT,
  user_agent TEXT,
  withdrawn_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_consent_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_consent_given ON consent_records(consent_given);

-- ============================================
-- Modify users table for RBAC integration
-- ============================================
-- Add RBAC-related columns to users table
ALTER TABLE users ADD COLUMN default_role_id INTEGER;
ALTER TABLE users ADD COLUMN is_superuser INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN rbac_version INTEGER NOT NULL DEFAULT 1;

-- Add foreign key constraint (SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we'll rely on application-level validation)
CREATE INDEX IF NOT EXISTS idx_users_default_role_id ON users(default_role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_superuser ON users(is_superuser);

-- ============================================
-- Modify sessions table for enhanced security
-- ============================================
-- Add security-related columns to sessions table
ALTER TABLE sessions ADD COLUMN ip_address TEXT;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;
ALTER TABLE sessions ADD COLUMN device_fingerprint TEXT;
ALTER TABLE sessions ADD COLUMN geo_location TEXT;
ALTER TABLE sessions ADD COLUMN is_revoked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN revoked_at TEXT;
ALTER TABLE sessions ADD COLUMN revoked_reason TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_sessions_ip_address ON sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_sessions_device_fingerprint ON sessions(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_sessions_is_revoked ON sessions(is_revoked);

-- ============================================
-- Seed Data: Roles
-- ============================================
INSERT INTO roles (name, description, level, is_system) VALUES
('super_admin', 'Full system access with all privileges', 100, 1),
('admin', 'Administrative access to most functions', 80, 1),
('manager', 'Management access to department functions', 60, 1),
('staff', 'Standard staff access', 40, 1),
('cleaner', 'Cleaner-specific access', 20, 1),
('client', 'Client-specific access', 10, 1);

-- ============================================
-- Seed Data: Permissions
-- ============================================
INSERT INTO permissions (name, resource, action, description, category) VALUES
-- User Management
('users.create', 'users', 'create', 'Create new users', 'user_management'),
('users.read', 'users', 'read', 'View user information', 'user_management'),
('users.update', 'users', 'update', 'Update user information', 'user_management'),
('users.delete', 'users', 'delete', 'Delete users', 'user_management'),
('users.assign_role', 'users', 'assign_role', 'Assign roles to users', 'user_management'),
('users.reset_password', 'users', 'reset_password', 'Reset user passwords', 'user_management'),

-- Role Management
('roles.create', 'roles', 'create', 'Create new roles', 'role_management'),
('roles.read', 'roles', 'read', 'View role information', 'role_management'),
('roles.update', 'roles', 'update', 'Update role information', 'role_management'),
('roles.delete', 'roles', 'delete', 'Delete roles', 'role_management'),
('roles.assign_permission', 'roles', 'assign_permission', 'Assign permissions to roles', 'role_management'),

-- Booking Management
('bookings.create', 'bookings', 'create', 'Create new bookings', 'booking_management'),
('bookings.read', 'bookings', 'read', 'View booking information', 'booking_management'),
('bookings.update', 'bookings', 'update', 'Update booking information', 'booking_management'),
('bookings.delete', 'bookings', 'delete', 'Delete bookings', 'booking_management'),
('bookings.assign', 'bookings', 'assign', 'Assign cleaners to bookings', 'booking_management'),

-- Staff Management
('staff.create', 'staff', 'create', 'Create staff records', 'staff_management'),
('staff.read', 'staff', 'read', 'View staff information', 'staff_management'),
('staff.update', 'staff', 'update', 'Update staff information', 'staff_management'),
('staff.delete', 'staff', 'delete', 'Delete staff records', 'staff_management'),
('staff.manage_pool', 'staff', 'manage_pool', 'Manage staff pool assignments', 'staff_management'),

-- Reports
('reports.read', 'reports', 'read', 'View reports', 'report_management'),
('reports.export', 'reports', 'export', 'Export reports', 'report_management'),
('reports.financial', 'reports', 'financial', 'Access financial reports', 'report_management'),

-- Audit Logs
('audit.read', 'audit', 'read', 'View audit logs', 'audit_management'),
('audit.export', 'audit', 'export', 'Export audit logs', 'audit_management'),

-- System Settings
('settings.read', 'settings', 'read', 'View system settings', 'system_management'),
('settings.update', 'settings', 'update', 'Update system settings', 'system_management');

-- ============================================
-- Seed Data: Role Permissions
-- ============================================
-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Admin: Most permissions except system settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE category != 'system_management';

-- Manager: User, booking, staff management
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE category IN ('user_management', 'booking_management', 'staff_management', 'report_management');

-- Staff: Read-only access to bookings and own profile
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE name IN ('users.read', 'bookings.read', 'staff.read');

-- Cleaner: Read-only access to own bookings
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE name IN ('users.read', 'bookings.read');

-- Client: Read-only access to own bookings
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE name IN ('users.read', 'bookings.read');

-- ============================================
-- Migrate existing users to RBAC
-- ============================================
-- Map existing role values to new RBAC roles
-- This is a simple mapping - adjust based on actual role values in your system
INSERT INTO user_roles (user_id, role_id, assigned_by, context)
SELECT 
  u.id as user_id,
  CASE 
    WHEN u.role = 'super_admin' THEN 1
    WHEN u.role = 'admin' THEN 2
    WHEN u.role = 'manager' THEN 3
    WHEN u.role = 'staff' THEN 4
    WHEN u.role = 'cleaner' THEN 5
    WHEN u.role = 'client' THEN 6
    ELSE 4 -- Default to staff if unknown
  END as role_id,
  NULL as assigned_by, -- System migration
  'migration' as context
FROM users u
WHERE u.role IS NOT NULL;

-- Update default_role_id for users
UPDATE users 
SET default_role_id = CASE 
  WHEN role = 'super_admin' THEN 1
  WHEN role = 'admin' THEN 2
  WHEN role = 'manager' THEN 3
  WHEN role = 'staff' THEN 4
  WHEN role = 'cleaner' THEN 5
  WHEN role = 'client' THEN 6
  ELSE 4
END
WHERE default_role_id IS NULL;

-- ============================================
-- Migration complete
-- ============================================
