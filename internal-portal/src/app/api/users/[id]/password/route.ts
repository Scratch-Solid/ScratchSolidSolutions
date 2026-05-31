export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';
import { logAuditEvent } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user, db } = authResult;

  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  try {
    const userId = parseInt(params.id);
    const requestingUserId = (user as any).userId;
    const requestingUserRole = (user as any).role;

    // Check if user is authorized to change this password
    // Users can change their own password, admins can change any password
    if (requestingUserId !== userId && requestingUserRole !== 'admin') {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'You are not authorized to change this user password',
          details: {
            requested_user_id: userId,
            requesting_user_id: requestingUserId
          },
          suggestion: 'You can only change your own password unless you are an admin'
        }
      }, { status: 403 });
      return withSecurityHeaders(response, traceId);
    }

    const body = await request.json() as { current_password?: string; new_password?: string; confirm_password?: string };
    const { current_password, new_password, confirm_password } = body;

    // Validate required fields
    if (!new_password || !confirm_password) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: {
            required_fields: ['new_password', 'confirm_password']
          },
          suggestion: 'Please provide both new_password and confirm_password'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // If user is changing their own password, require current password
    if (requestingUserId === userId && !current_password) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password is required',
          details: {
            field: 'current_password'
          },
          suggestion: 'Please provide your current password to verify your identity'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate password strength
    const passwordStrength = validatePasswordStrength(new_password);
    if (!passwordStrength.valid) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password does not meet strength requirements',
          details: {
            requirements: passwordStrength.requirements,
            missing: passwordStrength.missing
          },
          suggestion: passwordStrength.suggestion
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Check if new password matches confirmation
    if (new_password !== confirm_password) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Passwords do not match',
          details: {
            field: 'confirm_password'
          },
          suggestion: 'Please ensure new_password and confirm_password are identical'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Check if user exists
    const existingUser = await db.prepare(
      'SELECT id, password FROM users WHERE id = ?'
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

    // If user is changing their own password, verify current password
    if (requestingUserId === userId) {
      const currentPasswordHash = (existingUser as any).password;
      const isCurrentPasswordValid = await bcrypt.compare(current_password, currentPasswordHash);

      if (!isCurrentPasswordValid) {
        const response = NextResponse.json({
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: 'Current password is incorrect',
            details: {
              field: 'current_password'
            },
            suggestion: 'Please check your current password and try again'
          }
        }, { status: 401 });
        return withSecurityHeaders(response, traceId);
      }
    }

    // Hash new password with bcrypt (12 rounds as per standard)
    const newPasswordHash = await bcrypt.hash(new_password, 12);

    // Update password in database
    await db.prepare(
      'UPDATE users SET password = ?, password_needs_reset = 0, updated_at = datetime("now") WHERE id = ?'
    ).bind(newPasswordHash, userId).run();

    // Log audit event
    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAuditEvent(db, {
      user_id: requestingUserId,
      action: 'password_changed',
      resource: 'user',
      resource_id: String(userId),
      ip_address: ip,
      user_agent: userAgent,
      details: JSON.stringify({ changed_by_admin: requestingUserId !== userId }),
      success: true
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Password change error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to change password',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

function validatePasswordStrength(password: string): {
  valid: boolean;
  requirements: string[];
  missing: string[];
  suggestion: string;
} {
  const requirements = [
    { name: 'Minimum 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { name: 'At least 1 uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { name: 'At least 1 lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { name: 'At least 1 number', test: (pwd: string) => /[0-9]/.test(pwd) },
    { name: 'At least 1 special character', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) }
  ];

  const missing: string[] = [];
  for (const req of requirements) {
    if (!req.test(password)) {
      missing.push(req.name);
    }
  }

  const valid = missing.length === 0;
  const suggestion = valid 
    ? 'Password meets all strength requirements'
    : `Your password must include: ${missing.join(', ')}`;

  return {
    valid,
    requirements: requirements.map(r => r.name),
    missing,
    suggestion
  };
}
