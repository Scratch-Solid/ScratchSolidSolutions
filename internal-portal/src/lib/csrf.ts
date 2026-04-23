import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-me';

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
