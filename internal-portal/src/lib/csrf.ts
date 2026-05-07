import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-me';

// Warn if using default CSRF_SECRET in production
if (process.env.NODE_ENV === 'production' && CSRF_SECRET === 'default-csrf-secret-change-me') {
  console.error('SECURITY WARNING: Using default CSRF_SECRET in production. Set CSRF_SECRET environment variable.');
}

export function generateCsrfToken(): string {
  const token = randomBytes(32).toString('hex');
  const hash = createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
  return `${token}.${hash}`;
}

export function validateCsrfToken(token: string): boolean {
  const [payload, hash] = token.split('.');
  if (!payload || !hash) return false;
  const expected = createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
  return hash === expected;
}
