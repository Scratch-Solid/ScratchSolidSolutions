import { D1Database } from '@cloudflare/workers-types';

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  category: string;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  level: number;
  is_system: number;
  created_at: string;
}

export interface UserRole {
  user_id: number;
  role_id: number;
  role_name: string;
  role_level: number;
  assigned_at: string;
  expires_at: string | null;
  context: string | null;
}

export interface UserPermissions {
  userId: number;
  roles: UserRole[];
  permissions: string[];
  maxRoleLevel: number;
  isSuperuser: boolean;
}

// Permission levels for hierarchy
export const ROLE_LEVELS = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  staff: 40,
  cleaner: 20,
  client: 10
} as const;

// Cache permissions for performance (5 minute TTL)
const permissionCache = new Map<number, { data: UserPermissions; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getUserPermissions(db: D1Database, userId: number): Promise<UserPermissions> {
  // Check cache first
  const cached = permissionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    // Check if user is superuser from user_profile table
    const userProfile = await db.prepare(
      'SELECT is_superuser FROM user_profile WHERE user_id = ?'
    ).bind(userId).first();

    if (!userProfile) {
      // User profile not found, return minimal permissions
      const noProfilePerms: UserPermissions = {
        userId,
        roles: [],
        permissions: [],
        maxRoleLevel: 0,
        isSuperuser: false
      };
      permissionCache.set(userId, { data: noProfilePerms, expiresAt: Date.now() + CACHE_TTL });
      return noProfilePerms;
    }

    if ((userProfile as any).is_superuser === 1) {
      const superuserPerms: UserPermissions = {
        userId,
        roles: [],
        permissions: ['*'], // Wildcard for all permissions
        maxRoleLevel: 100,
        isSuperuser: true
      };
      permissionCache.set(userId, { data: superuserPerms, expiresAt: Date.now() + CACHE_TTL });
      return superuserPerms;
    }

    // Get user roles with details
    const userRoles = await db.prepare(`
      SELECT 
        ur.user_id,
        ur.role_id,
        r.name as role_name,
        r.level as role_level,
        ur.assigned_at,
        ur.expires_at,
        ur.context
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? 
        AND ur.is_active = 1
        AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
      ORDER BY r.level DESC
    `).bind(userId).all() as { results: any[] };

    const roles: UserRole[] = userRoles.results.map(r => ({
      user_id: r.user_id,
      role_id: r.role_id,
      role_name: r.role_name,
      role_level: r.role_level,
      assigned_at: r.assigned_at,
      expires_at: r.expires_at,
      context: r.context
    }));

    if (roles.length === 0) {
      // No roles assigned, return minimal permissions
      const noRolePerms: UserPermissions = {
        userId,
        roles: [],
        permissions: [],
        maxRoleLevel: 0,
        isSuperuser: false
      };
      permissionCache.set(userId, { data: noRolePerms, expiresAt: Date.now() + CACHE_TTL });
      return noRolePerms;
    }

    // Get all permissions from user's roles
    const roleIds = roles.map(r => r.role_id).join(',');
    const permissions = await db.prepare(`
      SELECT DISTINCT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id IN (${roleIds})
        AND rp.is_active = 1
        AND (rp.expires_at IS NULL OR rp.expires_at > datetime('now'))
    `).all() as { results: { name: string }[] };

    const permissionNames = permissions.results.map(p => p.name);

    // Check for permission denials (explicit denials override grants)
    const denials = await db.prepare(`
      SELECT p.name
      FROM permissions p
      JOIN permission_denials pd ON p.id = pd.permission_id
      WHERE pd.user_id = ? 
        AND pd.is_active = 1
        AND (pd.expires_at IS NULL OR pd.expires_at > datetime('now'))
    `).bind(userId).all() as { results: { name: string }[] };

    const denialNames = new Set(denials.results.map(d => d.name));

    // Filter out denied permissions
    const finalPermissions = permissionNames.filter(p => !denialNames.has(p));

    const maxRoleLevel = Math.max(...roles.map(r => r.role_level));

    const userPermissions: UserPermissions = {
      userId,
      roles,
      permissions: finalPermissions,
      maxRoleLevel,
      isSuperuser: false
    };

    // Cache the result
    permissionCache.set(userId, { data: userPermissions, expiresAt: Date.now() + CACHE_TTL });

    return userPermissions;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    // Return minimal permissions on error
    return {
      userId,
      roles: [],
      permissions: [],
      maxRoleLevel: 0,
      isSuperuser: false
    };
  }
}

export function hasPermission(userPermissions: UserPermissions, permission: string): boolean {
  if (userPermissions.isSuperuser) return true;
  return userPermissions.permissions.includes(permission);
}

export function hasResourcePermission(userPermissions: UserPermissions, resource: string, action: string): boolean {
  if (userPermissions.isSuperuser) return true;
  const permissionName = `${resource}.${action}`;
  return userPermissions.permissions.includes(permissionName);
}

export function hasRoleLevel(userPermissions: UserPermissions, requiredLevel: number): boolean {
  if (userPermissions.isSuperuser) return true;
  return userPermissions.maxRoleLevel >= requiredLevel;
}

export function hasRole(userPermissions: UserPermissions, roleName: string): boolean {
  if (userPermissions.isSuperuser) return true;
  return userPermissions.roles.some(r => r.role_name === roleName);
}

export function canManageUsers(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'users.create') ||
         hasPermission(userPermissions, 'users.update') ||
         hasPermission(userPermissions, 'users.delete') ||
         hasResourcePermission(userPermissions, 'users', 'create') ||
         hasResourcePermission(userPermissions, 'users', 'update') ||
         hasResourcePermission(userPermissions, 'users', 'delete') ||
         hasRoleLevel(userPermissions, ROLE_LEVELS.admin);
}

export function canViewAuditLogs(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'audit.read') ||
         hasResourcePermission(userPermissions, 'audit', 'read') ||
         hasRoleLevel(userPermissions, ROLE_LEVELS.admin);
}

export function canApproveAdmins(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'users.assign_role') ||
         hasResourcePermission(userPermissions, 'users', 'assign_role') ||
         hasRoleLevel(userPermissions, ROLE_LEVELS.super_admin);
}

export function canManageSystem(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'settings.update') ||
         hasResourcePermission(userPermissions, 'settings', 'update') ||
         hasRoleLevel(userPermissions, ROLE_LEVELS.super_admin);
}

// Clear cache for user (call after role changes)
export function clearUserPermissionCache(userId: number): void {
  permissionCache.delete(userId);
}

// Clear entire cache (call after major permission changes)
export function clearPermissionCache(): void {
  permissionCache.clear();
}

// Middleware helper function for API routes
export async function checkPermission(
  db: D1Database,
  userId: number,
  permission: string,
  resource?: string,
  action?: string
): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(db, userId);
    
    if (permission) {
      return hasPermission(userPermissions, permission);
    }
    
    if (resource && action) {
      return hasResourcePermission(userPermissions, resource, action);
    }
    
    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

// Get all available roles
export async function getAllRoles(db: D1Database): Promise<Role[]> {
  const result = await db.prepare('SELECT * FROM roles ORDER BY level DESC').all();
  return result.results as unknown as Role[];
}

// Get all available permissions
export async function getAllPermissions(db: D1Database): Promise<Permission[]> {
  const result = await db.prepare('SELECT * FROM permissions ORDER BY category, resource, action').all();
  return result.results as unknown as Permission[];
}

// Get permissions for a specific role
export async function getRolePermissions(db: D1Database, roleId: number): Promise<Permission[]> {
  const result = await db.prepare(`
    SELECT p.* FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ? AND rp.is_active = 1
    ORDER BY p.category, p.resource, p.action
  `).bind(roleId).all();
  return result.results as unknown as Permission[];
}

// Assign role to user
export async function assignRole(
  db: D1Database,
  userId: number,
  roleId: number,
  assignedBy: number,
  context?: string,
  expiresAt?: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at, context, expires_at)
    VALUES (?, ?, ?, datetime('now'), ?, ?)
    ON CONFLICT(user_id, role_id) DO UPDATE SET
      is_active = 1,
      assigned_by = excluded.assigned_by,
      assigned_at = excluded.assigned_at,
      context = excluded.context,
      expires_at = excluded.expires_at
  `).bind(userId, roleId, assignedBy, context || null, expiresAt || null).run();
  
  // Clear permission cache for this user
  clearUserPermissionCache(userId);
}

// Remove role from user (soft delete)
export async function removeRole(db: D1Database, userId: number, roleId: number): Promise<void> {
  await db.prepare(`
    UPDATE user_roles SET is_active = 0 WHERE user_id = ? AND role_id = ?
  `).bind(userId, roleId).run();
  
  // Clear permission cache for this user
  clearUserPermissionCache(userId);
}

// Create new role
export async function createRole(
  db: D1Database,
  name: string,
  description: string,
  level: number,
  createdBy?: number
): Promise<Role> {
  const result = await db.prepare(`
    INSERT INTO roles (name, description, level, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *
  `).bind(name, description, level, createdBy || null).first() as Role;
  
  return result;
}

// Create new permission
export async function createPermission(
  db: D1Database,
  name: string,
  description: string,
  resource: string,
  action: string,
  category: string,
  createdBy?: number
): Promise<Permission> {
  const result = await db.prepare(`
    INSERT INTO permissions (name, description, resource, action, category, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *
  `).bind(name, description, resource, action, category, createdBy || null).first() as Permission;
  
  return result;
}

// Assign permission to role
export async function assignPermissionToRole(
  db: D1Database,
  roleId: number,
  permissionId: number,
  grantedBy?: number,
  expiresAt?: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at, expires_at)
    VALUES (?, ?, ?, datetime('now'), ?)
    ON CONFLICT(role_id, permission_id) DO UPDATE SET
      is_active = 1,
      granted_by = excluded.granted_by,
      granted_at = excluded.granted_at,
      expires_at = excluded.expires_at
  `).bind(roleId, permissionId, grantedBy || null, expiresAt || null).run();
  
  // Clear all permission caches as role permissions changed
  clearPermissionCache();
}

// Remove permission from role (soft delete)
export async function removePermissionFromRole(db: D1Database, roleId: number, permissionId: number): Promise<void> {
  await db.prepare(`
    UPDATE role_permissions SET is_active = 0 WHERE role_id = ? AND permission_id = ?
  `).bind(roleId, permissionId).run();
  
  // Clear all permission caches as role permissions changed
  clearPermissionCache();
}

// Deny permission to user (explicit denial overrides grants)
export async function denyPermissionToUser(
  db: D1Database,
  userId: number,
  permissionId: number,
  deniedBy: number,
  reason?: string,
  expiresAt?: string
): Promise<void> {
  await db.prepare(`
    INSERT INTO permission_denials (user_id, permission_id, denied_by, denied_at, reason, expires_at)
    VALUES (?, ?, ?, datetime('now'), ?, ?)
    ON CONFLICT(user_id, permission_id) DO UPDATE SET
      is_active = 1,
      denied_by = excluded.denied_by,
      denied_at = excluded.denied_at,
      reason = excluded.reason,
      expires_at = excluded.expires_at
  `).bind(userId, permissionId, deniedBy, reason || null, expiresAt || null).run();
  
  // Clear permission cache for this user
  clearUserPermissionCache(userId);
}

// Remove permission denial from user
export async function removePermissionDenial(db: D1Database, userId: number, permissionId: number): Promise<void> {
  await db.prepare(`
    UPDATE permission_denials SET is_active = 0 WHERE user_id = ? AND permission_id = ?
  `).bind(userId, permissionId).run();
  
  // Clear permission cache for this user
  clearUserPermissionCache(userId);
}

// Log RBAC audit event
export async function logRbacEvent(
  db: D1Database,
  event: {
    userId?: number;
    targetUserId?: number;
    action: string;
    resourceType: string;
    resourceId?: number;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
    traceId?: string;
    sessionId?: string;
    metadata?: string;
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO rbac_audit_log (
      user_id, target_user_id, action, resource_type, resource_id,
      old_value, new_value, ip_address, user_agent, success,
      error_message, trace_id, session_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.userId || null,
    event.targetUserId || null,
    event.action,
    event.resourceType,
    event.resourceId || null,
    event.oldValue || null,
    event.newValue || null,
    event.ipAddress || null,
    event.userAgent || null,
    event.success !== undefined ? (event.success ? 1 : 0) : 1,
    event.errorMessage || null,
    event.traceId || null,
    event.sessionId || null,
    event.metadata || null
  ).run();
}

// Get user profile with custom fields
export async function getUserProfile(db: D1Database, userId: number): Promise<any> {
  const result = await db.prepare(
    'SELECT * FROM user_profile WHERE user_id = ?'
  ).bind(userId).first();
  return result;
}

// Update user profile
export async function updateUserProfile(
  db: D1Database,
  userId: number,
  updates: {
    paysheet_code?: string;
    phone?: string;
    role?: string;
    is_superuser?: number;
    default_role_id?: number;
    rbac_version?: number;
    password_needs_reset?: number;
    login_count?: number;
  }
): Promise<void> {
  const fields = [];
  const values = [];
  
  if (updates.paysheet_code !== undefined) {
    fields.push('paysheet_code = ?');
    values.push(updates.paysheet_code);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.is_superuser !== undefined) {
    fields.push('is_superuser = ?');
    values.push(updates.is_superuser);
  }
  if (updates.default_role_id !== undefined) {
    fields.push('default_role_id = ?');
    values.push(updates.default_role_id);
  }
  if (updates.rbac_version !== undefined) {
    fields.push('rbac_version = ?');
    values.push(updates.rbac_version);
  }
  if (updates.password_needs_reset !== undefined) {
    fields.push('password_needs_reset = ?');
    values.push(updates.password_needs_reset);
  }
  if (updates.login_count !== undefined) {
    fields.push('login_count = ?');
    values.push(updates.login_count);
  }
  
  if (fields.length === 0) return;
  
  values.push(userId);
  
  await db.prepare(`
    UPDATE user_profile SET ${fields.join(', ')} WHERE user_id = ?
  `).bind(...values).run();
  
  // Clear permission cache for this user
  clearUserPermissionCache(userId);
}
