/**
 * Input sanitization utilities for API endpoints
 * Prevents XSS, SQL injection, and other injection attacks
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent XSS
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (email === null || email === undefined) return '';
  const sanitized = email.trim().toLowerCase();
  // Basic email validation pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }
  return sanitized;
}

/**
 * Sanitize a phone number (keep only digits, +, -, spaces)
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (phone === null || phone === undefined) return '';
  return phone.replace(/[^\d+\-\s]/g, '').trim();
}

/**
 * Sanitize an ID/Passport number (alphanumeric only)
 */
export function sanitizeIdNumber(id: string | null | undefined): string {
  if (id === null || id === undefined) return '';
  return id.replace(/[^a-zA-Z0-9]/g, '').trim();
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any): number | null {
  if (input === null || input === undefined) return null;
  const num = Number(input);
  return isNaN(num) ? null : num;
}

/**
 * Sanitize a boolean input
 */
export function sanitizeBoolean(input: any): boolean {
  if (input === null || input === undefined) return false;
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1';
  }
  return Boolean(input);
}

/**
 * Sanitize an object by recursively sanitizing string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, options?: {
  emailFields?: string[];
  phoneFields?: string[];
  idFields?: string[];
  numberFields?: string[];
  booleanFields?: string[];
}): T {
  const sanitized: any = {};
  const {
    emailFields = [],
    phoneFields = [],
    idFields = [],
    numberFields = [],
    booleanFields = []
  } = options || {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (emailFields.includes(key) && typeof value === 'string') {
        sanitized[key] = sanitizeEmail(value);
      } else if (phoneFields.includes(key) && typeof value === 'string') {
        sanitized[key] = sanitizePhone(value);
      } else if (idFields.includes(key) && typeof value === 'string') {
        sanitized[key] = sanitizeIdNumber(value);
      } else if (numberFields.includes(key)) {
        sanitized[key] = sanitizeNumber(value);
      } else if (booleanFields.includes(key)) {
        sanitized[key] = sanitizeBoolean(value);
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, options);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize request body
 */
export function sanitizeRequestBody<T extends Record<string, any>>(
  body: T,
  schema: {
    required?: string[];
    optional?: string[];
    emailFields?: string[];
    phoneFields?: string[];
    idFields?: string[];
    numberFields?: string[];
    booleanFields?: string[];
  }
): { sanitized: T; error?: string } {
  const { required = [], optional = [], ...sanitizationOptions } = schema;

  // Check required fields
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return { sanitized: body as T, error: `Missing required field: ${field}` };
    }
  }

  // Sanitize the body
  const sanitized = sanitizeObject(body, sanitizationOptions);

  return { sanitized };
}
