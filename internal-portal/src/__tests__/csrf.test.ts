import { generateCsrfToken, validateCsrfToken } from '../lib/csrf';

// Mock crypto.subtle for Node.js test environment
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = require('crypto');
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}

describe('CSRF protection', () => {
  test('generateCsrfToken creates valid token', async () => {
    const token = await generateCsrfToken();
    expect(token).toContain('.');
    expect(token.length).toBeGreaterThan(10);
  });

  test('validateCsrfToken accepts generated tokens', async () => {
    const token = await generateCsrfToken();
    expect(await validateCsrfToken(token)).toBe(true);
  });

  test('validateCsrfToken rejects tampered tokens', async () => {
    expect(await validateCsrfToken('tampered.token')).toBe(false);
    expect(await validateCsrfToken('')).toBe(false);
  });
});
