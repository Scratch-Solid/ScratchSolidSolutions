import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET;

function getCsrfSecret(): string {
  if (!CSRF_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CSRF_SECRET environment variable is required in production');
    }
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
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return false;
    const payload = token.slice(0, dotIndex);
    const hash = token.slice(dotIndex + 1);
    if (!payload || !hash) return false;
    const expected = createHmac('sha256', getCsrfSecret()).update(payload).digest('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (hashBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(hashBuf, expectedBuf);
  } catch {
    return false;
  }
}
