/**
 * Security Middleware Integration
 * Combines rate limiting, security headers, and request validation
 */

import { NextResponse } from 'next/server';
import { authRateLimiter, generalRateLimiter, strictRateLimiter } from './rate-limiter';
import { getAPISecurityHeaders } from './security-headers';
import { validateRequest, securityCheck } from './request-validator';

export type SecurityLevel = 'auth' | 'general' | 'strict';

export interface SecurityOptions {
  requireAuth?: boolean;
  requireRole?: string[];
  rateLimit?: SecurityLevel;
  validateSchema?: any;
  enableSecurityCheck?: boolean;
}

/**
 * Apply security middleware to API responses
 */
export function applySecurityMiddleware(
  response: NextResponse,
  options: SecurityOptions = {}
): NextResponse {
  // Add security headers
  const headers = getAPISecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  identifier: string,
  level: SecurityLevel = 'general'
): { allowed: boolean; remaining: number; resetTime: number } {
  const limiter = level === 'auth' ? authRateLimiter : 
                   level === 'strict' ? strictRateLimiter : 
                   generalRateLimiter;
  
  return limiter.check(identifier);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  identifier: string,
  level: SecurityLevel = 'general'
): Record<string, string> {
  const limiter = level === 'auth' ? authRateLimiter : 
                   level === 'strict' ? strictRateLimiter : 
                   generalRateLimiter;
  
  return limiter.getHeaders(identifier);
}

/**
 * Validate request body against schema
 */
export function validateRequestBody<T>(
  schema: any,
  body: unknown
): { success: true; data: T } | { success: false; error: string; status: number } {
  const result = validateRequest<T>(schema, body);
  
  if (!result.success) {
    return {
      success: false,
      error: (result as { success: false; error: string }).error,
      status: 400
    };
  }
  
  return { success: true, data: result.data as T };
}

/**
 * Perform security checks on request data
 */
export function performSecurityChecks(
  data: Record<string, any>
): { safe: boolean; threat?: string } {
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      const check = securityCheck(value);
      if (!check.safe) {
        return check;
      }
    }
  }
  return { safe: true };
}

/**
 * Create a security error response
 */
export function createSecurityError(
  error: string,
  status: number = 400
): NextResponse {
  const response = NextResponse.json(
    { error },
    { status }
  );
  
  return applySecurityMiddleware(response);
}

/**
 * Create a rate limit error response
 */
export function createRateLimitError(
  resetTime: number
): NextResponse {
  const response = NextResponse.json(
    { 
      error: 'Rate limit exceeded',
      resetAt: new Date(resetTime).toISOString()
    },
    { status: 429 }
  );
  
  response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
  
  return applySecurityMiddleware(response);
}
