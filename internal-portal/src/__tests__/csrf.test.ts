import { generateCsrfToken, validateCsrfToken } from '../lib/csrf';

describe('CSRF protection', () => {
  test('generateCsrfToken creates valid token', () => {
    const token = generateCsrfToken();
    expect(token).toContain('.');
    expect(token.length).toBeGreaterThan(10);
  });

  test('validateCsrfToken accepts generated tokens', () => {
    const token = generateCsrfToken();
    expect(validateCsrfToken(token)).toBe(true);
  });

  test('validateCsrfToken rejects tampered tokens', () => {
    expect(validateCsrfToken('tampered.token')).toBe(false);
    expect(validateCsrfToken('')).toBe(false);
  });
});
