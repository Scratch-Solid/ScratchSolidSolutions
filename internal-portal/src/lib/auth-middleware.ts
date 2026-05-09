import { auth } from "@/lib/better-auth";
import { getDb } from "@/lib/db";
import { validateSession } from "@/lib/session-middleware";
import { NextRequest } from "next/server";

// Middleware to integrate Better Auth with existing RBAC system
export async function checkAuthAndRole(request: NextRequest, requiredRole?: string) {
  try {
    // Validate session first
    const sessionValidation = await validateSession(request);
    
    if (!sessionValidation.valid) {
      return { authenticated: false, error: sessionValidation.error };
    }

    const session = sessionValidation.session;

    // Get user from existing database to check role
    const db = await getDb();
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(session.user?.id).first();
    
    if (!user) {
      return { authenticated: false, error: "User not found" };
    }

    // Check role if required
    if (requiredRole && user.role !== requiredRole) {
      return { 
        authenticated: true, 
        user, 
        authorized: false, 
        error: `Requires ${requiredRole} role` 
      };
    }

    return { 
      authenticated: true, 
      user, 
      authorized: true, 
      session 
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { authenticated: false, error: "Authentication failed" };
  }
}
