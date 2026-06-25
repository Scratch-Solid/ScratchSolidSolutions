/**
 * Authentication Middleware for Backend Worker
 * JWT-based authentication only
 */

import jwt from '@tsndr/cloudflare-worker-jwt';

function getReadSession(env) {
  return env.scratchsolid_db.withSession("first-unconstrained");
}

async function verifyJWTToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const isValid = await jwt.verify(token, env.JWT_SECRET);
    if (!isValid) return null;
    const { payload } = jwt.decode(token);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(request, env, requiredRole = null) {
  const jwtPayload = await verifyJWTToken(request, env);
  if (!jwtPayload) {
    return { authenticated: false, error: 'Unauthorized' };
  }

  const db = getReadSession(env);
  const user = await db.prepare('SELECT * FROM users WHERE id = ?')
    .bind(parseInt(jwtPayload.sub)).first();

  if (!user) {
    return { authenticated: false, error: 'User not found' };
  }

  if (requiredRole && user.role !== requiredRole) {
    return { authenticated: true, authorized: false, error: 'Insufficient permissions' };
  }

  return { authenticated: true, authorized: true, user };
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

    return null; // Continue to route handler
  };
}
