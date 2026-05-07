import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET;

function getCsrfSecret(): string {
  if (!CSRF_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CSRF_SECRET environment variable is required in production');
    }
    // Use a fallback for development/build time
    return 'dev-secret-fallback-do-not-use-in-production';
  }
  return CSRF_SECRET;
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
