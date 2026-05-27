export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint is deprecated.
 * 
 * We have fully adopted Better-Auth for authentication.
 * Please use the Better-Auth endpoints at /api/auth/[...all] instead.
 * 
 * Better-Auth provides:
 * - Sign in: POST /api/auth/sign-in/email
 * - Sign out: POST /api/auth/sign-out
 * - Session: GET /api/auth/get-session
 * - 2FA: POST /api/auth/totp/enable, POST /api/auth/totp/verify
 * 
 * Migration completed: Users and sessions migrated to Better-Auth tables.
 * RBAC integration: Custom fields moved to user_profile table.
 * 
 * This endpoint will be removed in a future release.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is deprecated',
    message: 'Please use Better-Auth endpoints at /api/auth/[...all]',
    documentation: 'See Better-Auth documentation for available endpoints',
    newEndpoints: {
      signIn: '/api/auth/sign-in/email',
      signOut: '/api/auth/sign-out',
      getSession: '/api/auth/get-session',
      totpEnable: '/api/auth/totp/enable',
      totpVerify: '/api/auth/totp/verify'
    }
  }, { status: 410 }); // 410 Gone
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is deprecated',
    message: 'Please use Better-Auth endpoints at /api/auth/[...all]',
    documentation: 'See Better-Auth documentation for available endpoints'
  }, { status: 410 }); // 410 Gone
}
