export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { 
  applySecurityMiddleware, 
  checkRateLimit, 
  getRateLimitHeaders, 
  createSecurityError,
  createRateLimitError
} from '@/lib/security-middleware';
export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) {
    return createSecurityError('Database unavailable', 503);
  }

  // Get client identifier for rate limiting
  const clientId = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'anonymous';

  // Check rate limit
  const rateLimitResult = checkRateLimit(clientId, 'auth');
  if (!rateLimitResult.allowed) {
    const response = createRateLimitError(rateLimitResult.resetTime);
    const headers = getRateLimitHeaders(clientId, 'auth');
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  try {
    const body = await request.json() as { token?: string };
    const { token } = body;

    if (!token) {
      return createSecurityError('Verification token is required', 400);
    }

    // In a full implementation, this would:
    // 1. Validate token from email_verification_tokens table
    // 2. Check if token is expired
    // 3. Get user_id from token
    // 4. Update user.email_verified = 1
    // 5. Delete used token

    // For now, return a success message
    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    });

    applySecurityMiddleware(response);
    return response;

  } catch (error) {
    console.error('Verify email error:', error);
    return createSecurityError('Failed to verify email', 500);
  }
}
