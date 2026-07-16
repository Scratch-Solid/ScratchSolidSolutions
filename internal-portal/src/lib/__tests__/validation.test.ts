// Unit tests for validation functions

import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateLength
} from '../validation';

describe('Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com').valid).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.za').valid).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
      expect(validateEmail('user@').valid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongP@ssw0rd').valid).toBe(true);
      expect(validatePassword('C0mpl3x!Pass').valid).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('weak').valid).toBe(false);
      expect(validatePassword('password').valid).toBe(false);
      expect(validatePassword('PASSWORD123').valid).toBe(false);
      expect(validatePassword('Password!').valid).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate South African phone numbers', () => {
      expect(validatePhone('+27 82 123 4567').valid).toBe(true);
      expect(validatePhone('0821234567').valid).toBe(true);
      expect(validatePhone('011 123 4567').valid).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123').valid).toBe(false);
      expect(validatePhone('invalid').valid).toBe(false);
    });
  });

  describe('validateLength', () => {
    it('should validate field lengths within limits', () => {
      expect(validateLength('test', 'username').valid).toBe(true);
    });

    it('should reject fields exceeding limits', () => {
      expect(validateLength('a'.repeat(101), 'username').valid).toBe(false);
    });
  });
});
