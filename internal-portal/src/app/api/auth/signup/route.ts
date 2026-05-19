export const dynamic = "force-dynamic";
/**
 * Enhanced Signup Endpoint with Security Features
 * Phase 3.2: Enhanced API Security Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
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
    const validationResult: any = validateRequestBody(userSignupSchema, body);
    if (!validationResult.success) {
      return createSecurityError(validationResult.error, 400);
    }

    const { name, email, password, role, phone, address, business_name, business_info } = validationResult.data;

    const db = await getDb();
    if (!db) {
      return createSecurityError('Database unavailable', 503);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    try {
      await db.prepare(
        'INSERT INTO users (name, email, password_hash, role, phone, address, business_name, business_info, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))'
      ).bind(name, email, passwordHash, role || 'client', phone || '', address || '', business_name || '', business_info || '').run();
    } catch (dbError: any) {
      if (dbError.message?.includes('UNIQUE')) {
        return createSecurityError('Email already registered', 400);
      }
      throw dbError;
    }
    
    const response = NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        name,
        email,
        role: role || 'client'
      }
    });

    // Apply security headers
    applySecurityMiddleware(response);

    // Add rate limit headers
    const responseHeaders = getRateLimitHeaders(clientId, 'auth');
    Object.entries(responseHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Signup error:', error);
    return createSecurityError('Registration failed', 500);
  }
}
