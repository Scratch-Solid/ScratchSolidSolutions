// Unit tests for validation functions

import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateSaId,
  validateSaPassport,
  validateLength
} from '../validation';

describe('Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.za')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongP@ssw0rd')).toBe(true);
      expect(validatePassword('C0mpl3x!Pass')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('password')).toBe(false);
      expect(validatePassword('PASSWORD123')).toBe(false);
      expect(validatePassword('Password!')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate South African phone numbers', () => {
      expect(validatePhone('+27 82 123 4567')).toBe(true);
      expect(validatePhone('0821234567')).toBe(true);
      expect(validatePhone('011 123 4567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('invalid')).toBe(false);
    });
  });

  describe('validateLength', () => {
    it('should validate field lengths within limits', () => {
      expect(validateLength('test', 'username')).toBe(true);
      expect(validateLength('a'.repeat(100), 'description')).toBe(true);
    });

    it('should reject fields exceeding limits', () => {
      expect(validateLength('a'.repeat(101), 'username')).toBe(false);
      expect(validateLength('a'.repeat(201), 'description')).toBe(false);
    });
  });
});
