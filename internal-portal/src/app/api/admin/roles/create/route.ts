import { NextRequest, NextResponse } from 'next/server';
import { getDb, validateSession, logAuditEvent } from '@/lib/db';
import { createRole, getUserPermissions, canManageSystem } from '@/lib/rbac';
import { withRateLimit, withSecurityHeaders, withTracing, logRequest, getClientIP } from '@/lib/middleware';
import { sanitizeRequestBody } from '@/lib/sanitization';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const startTime = Date.now();
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) {
    return withSecurityHeaders(rateLimitResponse, traceId);
  }

  const db = await getDb();
  if (!db) {
    const response = NextResponse.json({ error: 'Database not available' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }

  try {
    // Validate admin session
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response = NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const token = authHeader.substring(7);
    const session = await validateSession(db, token);

    if (!session || (session as any).role !== 'admin' && (session as any).role !== 'super_admin') {
      const response = NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Get user permissions to check if they can manage roles
    const userPermissions = await getUserPermissions(db, (session as any).id);
    if (!canManageSystem(userPermissions)) {
      const response = NextResponse.json({ error: 'Insufficient permissions to manage roles' }, { status: 403 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    // Sanitize and validate request body
    const body = await request.json();
    const { sanitized, error } = sanitizeRequestBody(body, {
      required: ['name', 'description', 'level'],
      optional: []
    });

    if (error) {
      const response = NextResponse.json({ error }, { status: 400 });
      logRequest(request, response, Date.now() - startTime, traceId);
      return withSecurityHeaders(response, traceId);
    }

    const { name, description, level } = sanitized as { name: string; description: string; level: number };

    // Create new role
    const newRole = await createRole(db, name, description, level);

    // Log role creation
    await logAuditEvent(db, {
      user_id: (session as any).id,
      action: 'ROLE_CREATED',
      resource: 'roles',
      resource_id: newRole.id.toString(),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ name, description, level }),
      success: true,
      trace_id: traceId
    });

    const response = NextResponse.json({ 
      message: 'Role created successfully',
      role: newRole
    }, { status: 201 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    await logAuditEvent(db, {
      action: 'ROLE_CREATION_FAILED',
      resource: 'roles',
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || '',
      details: JSON.stringify({ error: (error as Error).message }),
      success: false,
      error_message: (error as Error).message,
      trace_id: traceId
    });

    const response = NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
    logRequest(request, response, Date.now() - startTime, traceId);
    return withSecurityHeaders(response, traceId);
  }
}
