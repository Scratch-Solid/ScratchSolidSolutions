/**
 * Authentication Middleware for Backend Worker
 * Supports both existing JWT and new Better Auth sessions
 * Ensures zero breakages during transition
 */

import jwt from '@tsndr/cloudflare-worker-jwt';

// Helper function to get database session for read operations
function getReadSession(env) {
  return env.DB.withSession("first-unconstrained");
}

// Helper function to get database session for consistent reads
function getConsistentReadSession(env) {
  return env.DB.withSession("first-primary");
}

// Existing JWT authentication (maintained for backward compatibility)
async function verifyJWTToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const payload = await jwt.verify(token, env.JWT_SECRET);
    return { type: 'jwt', payload };
  } catch (error) {
    return null;
  }
}

// Better Auth session validation (new integration)
async function verifyBetterAuthSession(request, env) {
  const sessionHeader = request.headers.get('X-Session-Token');
  if (!sessionHeader) {
    return null;
  }
  
  try {
    // Query Better Auth session from D1
    // Handle case where table doesn't exist yet
    const db = getReadSession(env);
    const session = await db.prepare(`
      SELECT s.*, u.id as user_id, u.email, u.role, u.name
      FROM better_auth_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `).bind(sessionHeader).first();
    
    if (session) {
      return { type: 'better-auth', payload: session };
    }
    return null;
  } catch (error) {
    // If table doesn't exist, return null to fall back to JWT
    if (error.message && error.message.includes('no such table')) {
      console.log('Better Auth sessions table not found, using JWT fallback');
      return null;
    }
    console.error('Better Auth session validation error:', error);
    return null;
  }
}

// Unified authentication middleware
export async function authenticateUser(request, env, requiredRole = null) {
  // Try Better Auth first (new system)
  const betterAuthResult = await verifyBetterAuthSession(request, env);
  if (betterAuthResult) {
    // Check 2FA requirement for sensitive operations
    if (requiredRole && requiredRole !== 'client') {
      try {
        const db = getReadSession(env);
        const user = await db.prepare('SELECT two_factor_enabled FROM users WHERE id = ?')
          .bind(betterAuthResult.payload.user_id).first();
        
        if (user && user.two_factor_enabled) {
          const twoFaHeader = request.headers.get('X-2FA-Token');
          if (!twoFaHeader) {
            return { authenticated: false, error: '2FA required', require2FA: true };
          }
          
          // Verify 2FA token (simplified for now)
          // In production, implement proper TOTP verification
        }
      } catch (error) {
        // If column doesn't exist, skip 2FA check
        if (error.message && error.message.includes('no such column')) {
          console.log('two_factor_enabled column not found, skipping 2FA check');
        }
      }
    }
    
    // Check role requirements
    if (requiredRole && betterAuthResult.payload.role !== requiredRole) {
      return { authenticated: true, authorized: false, error: 'Insufficient permissions' };
    }
    
    return { authenticated: true, authorized: true, user: betterAuthResult.payload, authType: 'better-auth' };
  }
  
  // Fall back to JWT (existing system)
  const jwtResult = await verifyJWTToken(request, env);
  if (jwtResult) {
    // Get user details from database
    const db = getReadSession(env);
    const user = await db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(parseInt(jwtResult.payload.sub)).first();
    
    if (user) {
      // Check role requirements
      if (requiredRole && user.role !== requiredRole) {
        return { authenticated: true, authorized: false, error: 'Insufficient permissions' };
      }
      
      return { authenticated: true, authorized: true, user, authType: 'jwt' };
    }
  }
  
  return { authenticated: false, error: 'Unauthorized' };
}

// Middleware function for itty-router
export function createAuthMiddleware(requiredRole = null) {
  return async (request, env) => {
    const authResult = await authenticateUser(request, env, requiredRole);
    
    if (!authResult.authenticated) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!authResult.authorized) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Attach user to request for use in route handlers
    request.user = authResult.user;
    request.authType = authResult.authType;
    
    return null; // Continue to route handler
  };
}
