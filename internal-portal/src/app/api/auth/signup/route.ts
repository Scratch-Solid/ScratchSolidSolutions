export const dynamic = "force-dynamic";
/**
 * Enhanced Signup Endpoint with Security Features
 * Phase 3.2: Enhanced API Security Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { userSignupSchema } from '@/lib/request-validator';
import { 
  applySecurityMiddleware, 
  checkRateLimit, 
  getRateLimitHeaders, 
  validateRequestBody,
  createSecurityError,
  createRateLimitError
} from '@/lib/security-middleware';

export async function POST(request: NextRequest) {
  // Get client identifier for rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'anonymous';
  
  // Check rate limit (auth endpoints have stricter limits)
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
    const body = await request.json();
    
    // Validate request body
    const validationResult = validateRequestBody(userSignupSchema, body);
    if (!validationResult.success) {
      return createSecurityError(validationResult.error, 400);
    }

    const { name, email, password, role, phone, address, business_name, business_info } = validationResult.data;

    // TODO: Implement actual user creation logic
    // For now, return success response with security headers
    
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        name,
        email,
        role
      }
    });

    // Apply security headers
    applySecurityMiddleware(response);

    // Add rate limit headers
    const headers = getRateLimitHeaders(clientId, 'auth');
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Signup error:', error);
    return createSecurityError('Registration failed', 500);
  }
}
