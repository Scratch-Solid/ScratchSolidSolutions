import { validateEmail, validatePassword, validatePhone, sanitizeInput, validateBookingDate } from '../lib/validation';

describe('validation', () => {
  test('validateEmail returns true for valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('admin@scratchsolid.co.za')).toBe(true);
  });
  test('validateEmail returns false for invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  test('validatePassword enforces complexity', () => {
    const result = validatePassword('Strong1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  test('validatePassword rejects weak passwords', () => {
    const result = validatePassword('weak');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validatePhone accepts valid SA numbers', () => {
    expect(validatePhone('+27 82 555 1234')).toBe(true);
    expect(validatePhone('0825551234')).toBe(true);
  });

  test('sanitizeInput escapes HTML', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('validateBookingDate rejects past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(validateBookingDate(yesterday.toISOString())).toBe(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(validateBookingDate(tomorrow.toISOString())).toBe(true);
  });
});
