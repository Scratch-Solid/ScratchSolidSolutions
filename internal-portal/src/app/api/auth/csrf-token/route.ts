export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@/lib/runtime-context';
import crypto from 'crypto';

async function getCsrfSecret(): Promise<string> {
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const secret = (env as any)?.CSRF_SECRET || process.env.CSRF_SECRET;
    if (secret) return secret;
  } catch {
    const secret = process.env.CSRF_SECRET;
    if (secret) return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CSRF_SECRET environment variable is required in production');
  }
  return 'dev-secret-fallback-do-not-use-in-production';
}

export async function GET(request: NextRequest) {
  const CSRF_SECRET = await getCsrfSecret();

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
