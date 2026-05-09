/**
 * Request Validation and Sanitization
 * Validates and sanitizes incoming API requests to prevent injection attacks
 */

import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(128);
export const nameSchema = z.string().min(1).max(255);
export const phoneSchema = z.string().regex(/^[+]?[\d\s-()]{10,20}$/).optional();
export const idSchema = z.string().uuid().or(z.number().int().positive());

// User validation schemas
export const userSignupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['admin', 'cleaner', 'digital', 'transport', 'client']),
  phone: phoneSchema,
  address: z.string().max(500).optional(),
  business_name: z.string().max(255).optional(),
  business_info: z.string().max(1000).optional()
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

// Booking validation schemas
export const bookingSchema = z.object({
  user_id: idSchema.optional(),
  booking_type: z.enum(['residential', 'commercial', 'deep_clean', 'move_in', 'move_out']),
  cleaning_type: z.enum(['standard', 'deep', 'specialized']),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'eft']),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  special_instructions: z.string().max(1000).optional()
});

// Template validation schemas
export const templateSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(10000)
});

// Contract validation schemas
export const contractSchema = z.object({
  business_id: idSchema,
  duration: z.number().int().min(1).max(10),
  template_id: idSchema
});

// Payment validation schemas
export const paymentSchema = z.object({
  booking_id: idSchema,
  method: z.enum(['cash', 'card', 'bank_transfer', 'eft']),
  amount: z.number().positive()
});

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize request body against a schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  params: URLSearchParams
): { success: true; data: T } | { success: false; error: string } {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  return validateRequest(schema, obj);
}

/**
 * Check for SQL injection patterns
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|UNION|SCRIPT)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(\bAND\b.*=.*\bAND\b)/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<[^>]*on\w+\s*=/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Comprehensive security check on input
 */
export function securityCheck(input: string): { safe: boolean; threat?: string } {
  if (detectSQLInjection(input)) {
    return { safe: false, threat: 'SQL injection detected' };
  }
  if (detectXSS(input)) {
    return { safe: false, threat: 'XSS detected' };
  }
  return { safe: true };
}
