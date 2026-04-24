// Input Validation Utilities
// Provides validation functions for API endpoints

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
  } else if (!/^\+?[\d\s-]{10,}$/.test(phone)) {
    errors.push('Invalid phone number format');
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

export function sanitizeString(input: string): string {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeEmail(input: string): string {
  if (!input) return '';
  return input.trim().toLowerCase();
}

export function sanitizePhone(input: string): string {
  if (!input) return '';
  return input.replace(/[\s-]/g, '');
}
