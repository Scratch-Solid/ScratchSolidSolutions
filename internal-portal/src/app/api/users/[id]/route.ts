export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';
import { logAuditEvent } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user, db } = authResult;

  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  try {
  const { id } = await params;
    const userId = parseInt(id);
    const requestingUserId = (user as any).userId;
    const requestingUserRole = (user as any).role;

    // Check if user is authorized to update this profile
    // Users can update their own profile, admins can update any profile
    if (requestingUserId !== userId && requestingUserRole !== 'admin') {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'You are not authorized to update this user profile',
          details: {
            requested_user_id: userId,
            requesting_user_id: requestingUserId
          },
          suggestion: 'You can only update your own profile unless you are an admin'
        }
      }, { status: 403 });
      return withSecurityHeaders(response, traceId);
    }

    const body = await request.json();
    const { name, phone, department, username } = body;

    // Validate that at least one field is being updated
    if (!name && !phone && !department && !username) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No fields to update',
          details: {
            available_fields: ['name', 'phone', 'department', 'username']
          },
          suggestion: 'Please provide at least one field to update'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate email format if username is being updated (username is often email)
    if (username) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(username)) {
        const response = NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            details: {
              field: 'username',
              value: username
            },
            suggestion: 'Please provide a valid email address (e.g., user@example.com)'
          }
        }, { status: 400 });
        return withSecurityHeaders(response, traceId);
      }
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        const response = NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid phone number format',
            details: {
              field: 'phone',
              value: phone
            },
            suggestion: 'Please provide a valid phone number (10-15 digits, optional + prefix)'
          }
        }, { status: 400 });
        return withSecurityHeaders(response, traceId);
      }
    }

    // Check if user exists
    const existingUser = await db.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!existingUser) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'User not found',
          details: {
            resource: 'user',
            id: userId
          },
          suggestion: 'The user may have been deleted or the ID is incorrect'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }

    updates.push('updated_at = datetime("now")');
    values.push(userId);

    await db.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    // Log audit event
    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAuditEvent(db, {
      user_id: requestingUserId,
      action: 'profile_updated',
      resource: 'user',
      resource_id: String(userId),
      ip_address: ip,
      user_agent: userAgent,
      details: JSON.stringify({ name, phone, department, username }),
      success: true
    });

    // Fetch updated user
    const updatedUser = await db.prepare(
      'SELECT id, email, name, role, phone, department, username, paysheet_code, created_at, updated_at FROM users WHERE id = ?'
    ).bind(userId).first();

    const response = NextResponse.json({
      success: true,
      data: updatedUser
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Profile update error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user profile',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user, db } = authResult;

  try {
  const { id } = await params;
    const userId = parseInt(id);
    const requestingUserId = (user as any).userId;
    const requestingUserRole = (user as any).role;

    // Check if user is authorized to view this profile
    // Users can view their own profile, admins can view any profile
    if (requestingUserId !== userId && requestingUserRole !== 'admin') {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'You are not authorized to view this user profile',
          details: {
            requested_user_id: userId,
            requesting_user_id: requestingUserId
          },
          suggestion: 'You can only view your own profile unless you are an admin'
        }
      }, { status: 403 });
      return withSecurityHeaders(response, traceId);
    }

    const userProfile = await db.prepare(
      'SELECT id, email, name, role, phone, department, username, paysheet_code, created_at, updated_at, last_login, login_count FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!userProfile) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'User not found',
          details: {
            resource: 'user',
            id: userId
          },
          suggestion: 'The user may have been deleted or the ID is incorrect'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json({
      success: true,
      data: userProfile
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Profile fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user profile',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
