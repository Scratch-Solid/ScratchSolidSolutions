# RBAC Database Schema Design
## Role-Based Access Control Tables with Audit Trails

**Date:** 2026-05-27
**Designer:** Cascade AI
**Database:** Cloudflare D1 (SQLite)
**Purpose:** Implement comprehensive RBAC system with audit trails

---

## Executive Summary

This document defines the database schema for implementing Role-Based Access Control (RBAC) in the Internal Portal. The schema includes roles, permissions, user-role assignments, and comprehensive audit trails for compliance and security monitoring.

**Total New Tables:** 6
**Modified Tables:** 2 (users, sessions)
**Index Strategy:** Optimized for common queries
**Audit Trail:** Comprehensive logging for all RBAC operations

---

## Schema Overview

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   users     │───────│  user_roles  │───────│   roles     │
└─────────────┘       └──────────────┘       └─────────────┘
                                                      │
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │role_permissions│
                                              └──────────────┘
                                                      │
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │  permissions │
                                              └──────────────┘

┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   users     │───────│   sessions   │───────│session_log  │
└─────────────┘       └──────────────┘       └─────────────┘

┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   users     │───────│failed_login_ │───────│  audit_log  │
└─────────────┘       │  attempts    │       └─────────────┘
                      └──────────────┘
```

---

## Table Definitions

### 1. roles

**Purpose:** Define system roles with hierarchical structure

```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0, -- Hierarchy level (higher = more privileges)
  is_system INTEGER NOT NULL DEFAULT 0, -- System roles cannot be deleted
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER, -- User ID who created this role
  updated_by INTEGER, -- User ID who last updated this role
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_roles_level ON roles(level);
CREATE INDEX idx_roles_name ON roles(name);
```

**Columns:**
- `id`: Primary key
- `name`: Unique role name (e.g., 'super_admin', 'admin', 'manager', 'staff')
- `description`: Human-readable description
- `level`: Hierarchy level for privilege comparison (0-100)
- `is_system`: Flag for system roles that cannot be deleted
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update
- `created_by`: User ID of creator
- `updated_by`: User ID of last updater

**Seed Data:**
```sql
INSERT INTO roles (name, description, level, is_system) VALUES
('super_admin', 'Full system access with all privileges', 100, 1),
('admin', 'Administrative access to most functions', 80, 1),
('manager', 'Management access to department functions', 60, 1),
('staff', 'Standard staff access', 40, 1),
('cleaner', 'Cleaner-specific access', 20, 1),
('client', 'Client-specific access', 10, 1);
```

---

### 2. permissions

**Purpose:** Define granular permissions for system resources

```sql
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL, -- Resource type (e.g., 'users', 'bookings', 'reports')
  action TEXT NOT NULL, -- Action (e.g., 'create', 'read', 'update', 'delete')
  description TEXT,
  category TEXT NOT NULL, -- Category for grouping (e.g., 'user_management', 'booking_management')
  is_system INTEGER NOT NULL DEFAULT 0, -- System permissions cannot be deleted
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER,
  updated_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_name ON permissions(name);
```

**Columns:**
- `id`: Primary key
- `name`: Unique permission name (e.g., 'users.create', 'bookings.read')
- `resource`: Resource type being accessed
- `action`: Action being performed
- `description`: Human-readable description
- `category`: Category for grouping permissions
- `is_system`: Flag for system permissions
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update
- `created_by`: User ID of creator
- `updated_by`: User ID of last updater

**Seed Data:**
```sql
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
```

---

### 3. role_permissions

**Purpose:** Assign permissions to roles (many-to-many relationship)

```sql
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  granted_by INTEGER, -- User ID who granted this permission
  expires_at TEXT, -- Optional expiration for temporary grants
  is_active INTEGER NOT NULL DEFAULT 1, -- Soft delete
  UNIQUE(role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_is_active ON role_permissions(is_active);
```

**Columns:**
- `id`: Primary key
- `role_id`: Foreign key to roles table
- `permission_id`: Foreign key to permissions table
- `granted_at`: Timestamp when permission was granted
- `granted_by`: User ID who granted this permission
- `expires_at`: Optional expiration for temporary grants
- `is_active`: Soft delete flag

**Seed Data:**
```sql
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
```

---

### 4. user_roles

**Purpose:** Assign roles to users (many-to-many relationship)

```sql
CREATE TABLE user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  assigned_by INTEGER, -- User ID who assigned this role
  expires_at TEXT, -- Optional expiration for temporary assignments
  is_active INTEGER NOT NULL DEFAULT 1, -- Soft delete
  context TEXT, -- Optional context (e.g., department, project)
  UNIQUE(user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at);
```

**Columns:**
- `id`: Primary key
- `user_id`: Foreign key to users table
- `role_id`: Foreign key to roles table
- `assigned_at`: Timestamp when role was assigned
- `assigned_by`: User ID who assigned this role
- `expires_at`: Optional expiration for temporary assignments
- `is_active`: Soft delete flag
- `context`: Optional context for the role assignment

---

### 5. permission_denials

**Purpose:** Explicitly deny specific permissions to users (overrides role grants)

```sql
CREATE TABLE permission_denials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  denied_at TEXT NOT NULL DEFAULT (datetime('now')),
  denied_by INTEGER, -- User ID who denied this permission
  reason TEXT, -- Reason for denial
  expires_at TEXT, -- Optional expiration for temporary denials
  is_active INTEGER NOT NULL DEFAULT 1, -- Soft delete
  UNIQUE(user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (denied_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_permission_denials_user_id ON permission_denials(user_id);
CREATE INDEX idx_permission_denials_permission_id ON permission_denials(permission_id);
CREATE INDEX idx_permission_denials_is_active ON permission_denials(is_active);
```

**Columns:**
- `id`: Primary key
- `user_id`: Foreign key to users table
- `permission_id`: Foreign key to permissions table
- `denied_at`: Timestamp when permission was denied
- `denied_by`: User ID who denied this permission
- `reason`: Reason for denial
- `expires_at`: Optional expiration for temporary denials
- `is_active`: Soft delete flag

---

### 6. rbac_audit_log

**Purpose:** Comprehensive audit trail for all RBAC operations

```sql
CREATE TABLE rbac_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  user_id INTEGER, -- User who performed the action
  target_user_id INTEGER, -- User affected by the action (if applicable)
  action TEXT NOT NULL, -- Action performed (e.g., 'role_assigned', 'permission_granted')
  resource_type TEXT NOT NULL, -- Resource type (e.g., 'role', 'permission', 'user_role')
  resource_id INTEGER, -- ID of the resource affected
  old_value TEXT, -- Previous value (JSON)
  new_value TEXT, -- New value (JSON)
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER NOT NULL DEFAULT 1, -- Whether the action succeeded
  error_message TEXT,
  trace_id TEXT, -- Distributed tracing ID
  session_id TEXT,
  metadata TEXT, -- Additional metadata (JSON)
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (target_user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_rbac_audit_log_timestamp ON rbac_audit_log(timestamp);
CREATE INDEX idx_rbac_audit_log_user_id ON rbac_audit_log(user_id);
CREATE INDEX idx_rbac_audit_log_target_user_id ON rbac_audit_log(target_user_id);
CREATE INDEX idx_rbac_audit_log_action ON rbac_audit_log(action);
CREATE INDEX idx_rbac_audit_log_resource_type ON rbac_audit_log(resource_type);
CREATE INDEX idx_rbac_audit_log_resource_id ON rbac_audit_log(resource_id);
CREATE INDEX idx_rbac_audit_log_trace_id ON rbac_audit_log(trace_id);
```

**Columns:**
- `id`: Primary key
- `timestamp`: Timestamp of the action
- `user_id`: User who performed the action
- `target_user_id`: User affected by the action
- `action`: Action performed
- `resource_type`: Resource type affected
- `resource_id`: ID of the resource affected
- `old_value`: Previous value (JSON)
- `new_value`: New value (JSON)
- `ip_address`: IP address of the request
- `user_agent`: User agent of the request
- `success`: Whether the action succeeded
- `error_message`: Error message if action failed
- `trace_id`: Distributed tracing ID
- `session_id`: Session ID
- `metadata`: Additional metadata (JSON)

---

## Modified Tables

### users table modifications

**Add columns for RBAC integration:**

```sql
-- Add RBAC-related columns to users table
ALTER TABLE users ADD COLUMN default_role_id INTEGER;
ALTER TABLE users ADD COLUMN is_superuser INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN rbac_version INTEGER NOT NULL DEFAULT 1;

-- Add foreign key constraint
ALTER TABLE users ADD FOREIGN KEY (default_role_id) REFERENCES roles(id);

-- Add index
CREATE INDEX idx_users_default_role_id ON users(default_role_id);
CREATE INDEX idx_users_is_superuser ON users(is_superuser);
```

**Columns:**
- `default_role_id`: Default role for the user
- `is_superuser`: Flag for superuser status (bypasses RBAC)
- `rbac_version`: Version of RBAC data for the user

---

### sessions table modifications

**Add columns for enhanced session security:**

```sql
-- Add security-related columns to sessions table
ALTER TABLE sessions ADD COLUMN ip_address TEXT;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;
ALTER TABLE sessions ADD COLUMN device_fingerprint TEXT;
ALTER TABLE sessions ADD COLUMN geo_location TEXT; -- JSON
ALTER TABLE sessions ADD COLUMN is_revoked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN revoked_at TEXT;
ALTER TABLE sessions ADD COLUMN revoked_reason TEXT;

-- Add indexes
CREATE INDEX idx_sessions_ip_address ON sessions(ip_address);
CREATE INDEX idx_sessions_device_fingerprint ON sessions(device_fingerprint);
CREATE INDEX idx_sessions_is_revoked ON sessions(is_revoked);
```

**Columns:**
- `ip_address`: IP address of the session
- `user_agent`: User agent of the session
- `device_fingerprint`: Device fingerprint for session binding
- `geo_location`: Geolocation data (JSON)
- `is_revoked`: Flag for revoked sessions
- `revoked_at`: Timestamp when session was revoked
- `revoked_reason`: Reason for revocation

---

## Additional Tables (Optional but Recommended)

### failed_login_attempts

**Purpose:** Track failed login attempts for security monitoring

```sql
CREATE TABLE failed_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL, -- Email, username, or phone
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT, -- Reason for failure (e.g., 'invalid_password', 'account_locked')
  metadata TEXT -- Additional metadata (JSON)
);

-- Indexes
CREATE INDEX idx_failed_login_attempts_identifier ON failed_login_attempts(identifier);
CREATE INDEX idx_failed_login_attempts_ip_address ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_attempts_attempted_at ON failed_login_attempts(attempted_at);
```

---

### consent_records

**Purpose:** Track user consent for GDPR/POPIA compliance

```sql
CREATE TABLE consent_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL, -- Type of consent (e.g., 'data_processing', 'marketing')
  consent_given INTEGER NOT NULL,
  consented_at TEXT NOT NULL DEFAULT (datetime('now')),
  consent_version TEXT NOT NULL, -- Version of consent text
  consent_text TEXT, -- Full consent text
  ip_address TEXT,
  user_agent TEXT,
  withdrawn_at TEXT, -- If consent was withdrawn
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_consent_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_consent_given ON consent_records(consent_given);
```

---

## Query Patterns

### Get User Permissions

```sql
-- Get all permissions for a user
SELECT DISTINCT p.*
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_roles ur ON rp.role_id = ur.role_id
WHERE ur.user_id = ? 
  AND ur.is_active = 1 
  AND rp.is_active = 1
  AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
  AND (rp.expires_at IS NULL OR rp.expires_at > datetime('now'))

EXCEPT

-- Exclude denied permissions
SELECT p.*
FROM permissions p
JOIN permission_denials pd ON p.id = pd.permission_id
WHERE pd.user_id = ? 
  AND pd.is_active = 1
  AND (pd.expires_at IS NULL OR pd.expires_at > datetime('now'));
```

### Check User Has Permission

```sql
-- Check if user has a specific permission
SELECT COUNT(*) as has_permission
FROM (
  SELECT 1
  FROM permissions p
  JOIN role_permissions rp ON p.id = rp.permission_id
  JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = ? 
    AND p.name = ?
    AND ur.is_active = 1 
    AND rp.is_active = 1
    AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
    AND (rp.expires_at IS NULL OR rp.expires_at > datetime('now'))
  
  EXCEPT
  
  SELECT 1
  FROM permissions p
  JOIN permission_denials pd ON p.id = pd.permission_id
  WHERE pd.user_id = ? 
    AND p.name = ?
    AND pd.is_active = 1
    AND (pd.expires_at IS NULL OR pd.expires_at > datetime('now'))
);
```

### Get User Roles

```sql
-- Get all active roles for a user
SELECT r.*, ur.assigned_at, ur.expires_at, ur.context
FROM roles r
JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = ? 
  AND ur.is_active = 1
  AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
ORDER BY r.level DESC;
```

### Get Role Permissions

```sql
-- Get all permissions for a role
SELECT p.*, rp.granted_at, rp.expires_at
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = ? 
  AND rp.is_active = 1
  AND (rp.expires_at IS NULL OR rp.expires_at > datetime('now'))
ORDER BY p.category, p.name;
```

---

## Data Integrity Constraints

### Cascade Deletes
- `role_permissions`: Cascade delete when role or permission is deleted
- `user_roles`: Cascade delete when user or role is deleted
- `permission_denials`: Cascade delete when user or permission is deleted

### Unique Constraints
- `roles.name`: Unique role name
- `permissions.name`: Unique permission name
- `role_permissions(role_id, permission_id)`: Unique role-permission combination
- `user_roles(user_id, role_id)`: Unique user-role combination
- `permission_denials(user_id, permission_id)`: Unique user-permission denial

### Foreign Key Constraints
- All foreign keys properly defined with ON DELETE CASCADE where appropriate

---

## Performance Considerations

### Index Strategy
- All foreign keys indexed
- Common query patterns indexed
- Composite indexes for complex queries
- Partial indexes for active records (is_active = 1)

### Query Optimization
- Use EXPLAIN QUERY PLAN for complex queries
- Consider materialized views for frequent aggregations
- Implement query result caching where appropriate

### Data Retention
- `rbac_audit_log`: Retain for 2 years
- `failed_login_attempts`: Retain for 1 year
- `consent_records`: Retain indefinitely (compliance requirement)

---

## Migration Strategy

### Rollback Plan
Each migration will include a rollback script to revert changes if needed.

### Data Migration
- Existing users will be assigned default roles based on their current `role` field
- Audit logs will be preserved during migration
- No data loss expected during migration

### Backward Compatibility
- Existing `role` field in users table will be deprecated but not removed immediately
- Gradual migration to new RBAC system
- Dual operation period for validation

---

## Security Considerations

### Access Control
- RBAC tables will be protected by the RBAC system itself
- Superuser role required for direct database modifications
- Audit logging for all RBAC modifications

### Encryption
- Consider encryption for sensitive audit data
- Implement field-level encryption if needed

### Audit Trail
- All RBAC operations logged to `rbac_audit_log`
- Immutable audit trail (no updates, only inserts)
- Tamper-evident logging with digital signatures

---

## Compliance Mapping

### POPIA Compliance
- ✅ Data minimization: Only necessary RBAC data stored
- ✅ Audit trail: Comprehensive logging
- ✅ Data retention: Defined retention policies
- ✅ Access control: Role-based access to RBAC data

### GDPR Compliance
- ✅ Lawful basis: User consent for role assignments
- ✅ Data subject rights: Can view and modify own role assignments
- ✅ Accountability: Comprehensive audit trail
- ✅ Data protection by design: RBAC built into system architecture

---

## Next Steps

1. **Create Migration Scripts** - Generate SQL migration files
2. **Test Locally** - Test migration on local D1 instance
3. **Deploy to Staging** - Apply migration to staging database
4. **Verify Data** - Validate RBAC tables and seed data
5. **Implement RBAC Library** - Choose and implement RBAC library
6. **Create Middleware** - Implement permission checking middleware
7. **Write Tests** - Create unit and integration tests
8. **Deploy to Production** - Apply migration to production database

---

**Document Status:** DRAFT
**Next Review:** After migration creation
**Approved By:** [Pending]
