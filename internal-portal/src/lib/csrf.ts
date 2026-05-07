import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET;

function getCsrfSecret(): string {
  if (!CSRF_SECRET) {
    throw new Error('CSRF_SECRET environment variable is required');
  }
  return CSRF_SECRET;
}

if (process.env.NODE_ENV === 'production' && !CSRF_SECRET) {
  throw new Error('CRITICAL SECURITY WARNING: CSRF_SECRET environment variable is not set in production');
}

export function generateCsrfToken(): string {
  const token = randomBytes(32).toString('hex');
  const hash = createHmac('sha256', getCsrfSecret()).update(token).digest('hex');
  return `${token}.${hash}`;
}

export function validateCsrfToken(token: string): boolean {
  const [payload, hash] = token.split('.');
  if (!payload || !hash) return false;
  const expected = createHmac('sha256', getCsrfSecret()).update(payload).digest('hex');
  return hash === expected;
}
