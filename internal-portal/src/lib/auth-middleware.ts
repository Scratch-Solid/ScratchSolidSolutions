import { verifyAccessToken, getUserPermissions, isSuperuser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * World-Class Authentication Middleware
 * 
 * Integrates JWT-based authentication with the existing RBAC system.
 * Provides role-based and permission-based access control.
 */

export interface AuthResult {
  authenticated: boolean;
  authorized?: boolean;
  user?: any;
  permissions?: string[];
  error?: string;
}

/**
 * Check authentication and role
 */
export async function checkAuthAndRole(request: NextRequest, requiredRole?: string): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Authorization header required' };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }

    const db = await getDb();
    if (!db) {
      return { authenticated: false, error: 'Database not available' };
    }

    // Get user from database
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(decoded.userId).first();
    
    if (!user) {
      return { authenticated: false, error: 'User not found' };
    }

    // Check role if required
    if (requiredRole && (user as any).role !== requiredRole) {
      return { 
        authenticated: true, 
        user, 
        authorized: false, 
        error: `Requires ${requiredRole} role` 
      };
    }

    return { 
      authenticated: true, 
      authorized: true, 
      user 
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

/**
 * Check authentication and specific permission
 */
export async function checkAuthAndPermission(request: NextRequest, requiredPermission: string): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Authorization header required' };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }

    const db = await getDb();
    if (!db) {
      return { authenticated: false, error: 'Database not available' };
    }

    // Get user from database
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(decoded.userId).first();
    
    if (!user) {
      return { authenticated: false, error: 'User not found' };
    }

    // Check if user is superuser (bypasses permission checks)
    const superuser = await isSuperuser(db, decoded.userId);
    if (superuser) {
      return { 
        authenticated: true, 
        authorized: true, 
        user,
        permissions: ['*'] // Superuser has all permissions
      };
    }

    // Get user permissions
    const permissions = await getUserPermissions(db, decoded.userId);
    
    if (!permissions.includes(requiredPermission)) {
      return { 
        authenticated: true, 
        user, 
        authorized: false, 
        permissions,
        error: `Requires ${requiredPermission} permission` 
      };
    }

    return { 
      authenticated: true, 
      authorized: true, 
      user,
      permissions
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

/**
 * Check authentication only (no role/permission check)
 */
export async function checkAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Authorization header required' };
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }

    const db = await getDb();
    if (!db) {
      return { authenticated: false, error: 'Database not available' };
    }

    // Get user from database
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(decoded.userId).first();
    
    if (!user) {
      return { authenticated: false, error: 'User not found' };
    }

    // Get user permissions
    const permissions = await getUserPermissions(db, decoded.userId);
    const superuser = await isSuperuser(db, decoded.userId);

    return { 
      authenticated: true, 
      user,
      permissions: superuser ? ['*'] : permissions
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

