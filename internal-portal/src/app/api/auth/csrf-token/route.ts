export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getEnvVar } from '@/lib/env';
import crypto from 'crypto';

const CSRF_SECRET = getEnvVar('CSRF_SECRET');

export async function GET(request: NextRequest) {
  // Generate CSRF token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Create a signature using the secret
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
  
  // Combine token and signature
  const csrfToken = `${token}.${signature}`;
  
  // Set token in httpOnly cookie
  const response = NextResponse.json({ csrfToken });
  const isProduction = process.env.NODE_ENV === 'production';
  
  response.cookies.set('csrf_token', csrfToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 3600, // 1 hour
  });
  
  return response;
}
