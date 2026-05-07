/**
 * @module validation
 * @description Input validation helpers for API route handlers.
 *
 * Exports:
 *   validateEmail         — RFC-compliant e-mail format check.
 *   validatePassword      — Complexity rules (8+ chars, upper, lower, digit, special).
 *   validatePhone         — South African phone number format check.
 *   validateSaIdNumber    — South African ID number format and Luhn check.
 *   validateSaPassport    — South African passport number format check.
 *   validateRequired      — Null / empty check for any value.
 *   validateString        — Type + min/max length check for strings.
 *   validateNumber        — Type + min/max range check for numbers.
 *   validateDate          — Parseable date-string check.
 *   validateEnum          — Membership check against an allowed-values list.
 *
 * NOTE: Input sanitisation (HTML-escaping, stripping unsafe characters) is
 *       handled by sanitizeString / sanitizeEmail / sanitizePhone in lib/db.ts,
 *       which are the single authoritative versions used by all API routes.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  }
  
  return { valid: errors.length === 0, errors };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone) {
    errors.push('Phone number is required');
  } else {
    // Remove all non-digit characters for validation
    const digits = phone.replace(/\D/g, '');

    // South African phone number validation
    // Format: +27 XX XXX XXXX or 0XX XXX XXXX (10 digits after country code, 11 with leading 0)
    if (digits.length === 11 && digits.startsWith('0')) {
      // Format: 0XX XXX XXXX - valid SA format
    } else if (digits.length === 10 && digits.startsWith('27')) {
      // Format: +27 XX XXX XXXX - valid SA format
    } else {
      errors.push('Invalid South African phone number. Use format: +27 XX XXX XXXX or 0XX XXX XXXX');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSaIdNumber(idNumber: string): ValidationResult {
  const errors: string[] = [];

  if (!idNumber) {
    errors.push('South African ID number is required');
  } else {
    // Remove spaces and dashes
    const cleaned = idNumber.replace(/[\s-]/g, '');

    // SA ID must be exactly 13 digits
    if (!/^\d{13}$/.test(cleaned)) {
      errors.push('South African ID number must be exactly 13 digits');
    } else {
      // Luhn algorithm validation
      let sum = 0;
      let alternate = false;

      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned.charAt(i), 10);

        if (alternate) {
          digit *= 2;
          if (digit > 9) {
            digit = Math.floor(digit / 10) + (digit % 10);
          }
        }

        sum += digit;
        alternate = !alternate;
      }

      if (sum % 10 !== 0) {
        errors.push('Invalid South African ID number - failed validation check');
      }

      // Validate date of birth (first 6 digits: YYMMDD)
      const year = parseInt(cleaned.substring(0, 2), 10);
      const month = parseInt(cleaned.substring(2, 4), 10);
      const day = parseInt(cleaned.substring(4, 6), 10);

      // Determine century (SA ID uses specific logic)
      const currentYear = new Date().getFullYear();
      const century = year > (currentYear % 100) ? 1900 : 2000;
      const fullYear = century + year;

      if (month < 1 || month > 12) {
        errors.push('Invalid month in ID number');
      } else if (day < 1 || day > 31) {
        errors.push('Invalid day in ID number');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSaPassport(passportNumber: string): ValidationResult {
  const errors: string[] = [];

  if (!passportNumber) {
    errors.push('Passport number is required');
  } else {
    // South African passport format: 1 letter + 8 digits (e.g., A12345678)
    // Or sometimes 2 letters + digits for newer passports
    const cleaned = passportNumber.replace(/[\s-]/g, '').toUpperCase();

    if (!/^[A-Z]{1,2}\d{8,9}$/.test(cleaned)) {
      errors.push('Invalid South African passport number. Format: 1-2 letters followed by 8-9 digits');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateRequired(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];
  
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} is required`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateString(value: any, fieldName: string, minLength = 0, maxLength = 1000): ValidationResult {
  const errors: string[] = [];
  
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} is required`);
  } else if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
  } else if (value.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  } else if (value.length > maxLength) {
    errors.push(`${fieldName} must not exceed ${maxLength} characters`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateNumber(value: any, fieldName: string, min = 0, max = Number.MAX_SAFE_INTEGER): ValidationResult {
  const errors: string[] = [];
  
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} is required`);
  } else if (isNaN(Number(value))) {
    errors.push(`${fieldName} must be a valid number`);
  } else {
    const num = Number(value);
    if (num < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }
    if (num > max) {
      errors.push(`${fieldName} must not exceed ${max}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateDate(value: any, fieldName: string): ValidationResult {
  const errors: string[] = [];
  
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} is required`);
  } else if (isNaN(Date.parse(value))) {
    errors.push(`${fieldName} must be a valid date`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateEnum(value: any, fieldName: string, allowedValues: string[]): ValidationResult {
  const errors: string[] = [];
  
  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} is required`);
  } else if (!allowedValues.includes(value)) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}

