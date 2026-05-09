import { D1Database } from '@cloudflare/workers-types';

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  level: number;
  created_at: string;
}

export interface UserPermissions {
  userId: number;
  role: string;
  permissions: string[];
  roleLevel: number;
}

// Permission levels for hierarchy
export const ROLE_LEVELS = {
  super_admin: 100,
  admin: 80,
  moderator: 60,
  viewer: 40,
  client: 20,
  cleaner: 10,
  digital: 10,
  transport: 10
} as const;

// Cache permissions for performance
const permissionCache = new Map<number, UserPermissions>();

export async function getUserPermissions(db: D1Database, userId: number): Promise<UserPermissions> {
  // Check cache first
  if (permissionCache.has(userId)) {
    return permissionCache.get(userId)!;
  }

  try {
    // Get user with role
    const user = await db.prepare(
      'SELECT id, role FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      throw new Error('User not found');
    }

    // Get role details
    const role = await db.prepare(
      'SELECT * FROM roles WHERE name = ?'
    ).bind((user as any).role).first() as Role;

    if (!role) {
      throw new Error('Role not found');
    }

    // Get role permissions
    const permissions = await db.prepare(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `).bind(role.id).all() as { results: Permission[] };

    const permissionNames = permissions.results.map(p => p.name);

    const userPermissions: UserPermissions = {
      userId,
      role: (user as any).role,
      permissions: permissionNames,
      roleLevel: role.level
    };

    // Cache the result
    permissionCache.set(userId, userPermissions);

    return userPermissions;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    // Return minimal permissions on error
    return {
      userId,
      role: 'client',
      permissions: [],
      roleLevel: 0
    };
  }
}

export function hasPermission(userPermissions: UserPermissions, permission: string): boolean {
  return userPermissions.permissions.includes(permission);
}

export function hasResourcePermission(userPermissions: UserPermissions, resource: string, action: string): boolean {
  const permissionName = `${resource}.${action}`;
  return userPermissions.permissions.includes(permissionName);
}

export function hasRoleLevel(userPermissions: UserPermissions, requiredLevel: number): boolean {
  return userPermissions.roleLevel >= requiredLevel;
}

export function canManageUsers(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'users.manage') || 
         hasResourcePermission(userPermissions, 'users', 'manage') ||
         hasRoleLevel(userPermissions, ROLE_LEVELS.admin);
}

export function canViewAuditLogs(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'audit.read') || 
         hasResourcePermission(userPermissions, 'audit', 'read') ||
         hasRoleLevel(userPermissions, ROLE_LEVELS.admin);
}

export function canApproveAdmins(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'admin.approve') || 
         hasResourcePermission(userPermissions, 'admin', 'approve') ||
         hasRoleLevel(userPermissions, ROLE_LEVELS.super_admin);
}

export function canManageSystem(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'system.config') || 
         hasResourcePermission(userPermissions, 'system', 'config') ||
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
  const result = await db.prepare('SELECT * FROM permissions ORDER BY resource, action').all();
  return result.results as unknown as Permission[];
}

// Assign role to user
export async function assignRole(db: D1Database, userId: number, roleId: number, assignedBy: number): Promise<void> {
  await db.prepare(`
    INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
    VALUES (?, ?, ?, datetime('now'))
  `).bind(userId, roleId, assignedBy).run();
  
  // Clear permission cache for this user
  clearUserPermissionCache(userId);
}

// Remove role from user
export async function removeRole(db: D1Database, userId: number, roleId: number): Promise<void> {
  await db.prepare(`
    DELETE FROM user_roles WHERE user_id = ? AND role_id = ?
  `).bind(userId, roleId).run();
  
  // Clear permission cache for this user
  clearUserPermissionCache(userId);
}

// Create new role
export async function createRole(db: D1Database, name: string, description: string, level: number): Promise<Role> {
  const result = await db.prepare(`
    INSERT INTO roles (name, description, level)
    VALUES (?, ?, ?) RETURNING *
  `).bind(name, description, level).first() as Role;
  
  return result;
}

// Create new permission
export async function createPermission(db: D1Database, name: string, description: string, resource: string, action: string): Promise<Permission> {
  const result = await db.prepare(`
    INSERT INTO permissions (name, description, resource, action)
    VALUES (?, ?, ?, ?) RETURNING *
  `).bind(name, description, resource, action).first() as Permission;
  
  return result;
}

// Assign permission to role
export async function assignPermissionToRole(db: D1Database, roleId: number, permissionId: number): Promise<void> {
  await db.prepare(`
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (?, ?)
  `).bind(roleId, permissionId).run();
  
  // Clear all permission caches as role permissions changed
  clearPermissionCache();
}

// Remove permission from role
export async function removePermissionFromRole(db: D1Database, roleId: number, permissionId: number): Promise<void> {
  await db.prepare(`
    DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?
  `).bind(roleId, permissionId).run();
  
  // Clear all permission caches as role permissions changed
  clearPermissionCache();
}
