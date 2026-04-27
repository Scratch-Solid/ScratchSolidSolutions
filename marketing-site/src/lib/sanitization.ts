/**
 * XSS Sanitization Utilities
 * Prevents Cross-Site Scripting (XSS) attacks by sanitizing user input
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes dangerous HTML tags and attributes
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';
  
  // Remove dangerous HTML tags
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'form', 'input', 'button',
    'link', 'meta', 'style', 'onerror', 'onload', 'onclick', 'onmouseover'
  ];
  
  let sanitized = input;
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '');
  
  // Remove other dangerous tags
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gim');
    sanitized = sanitized.replace(regex, '');
    sanitized = sanitized.replace(new RegExp(`<${tag}\\b[^>]*>`, 'gim'), '');
  });
  
  // Remove event handlers (on* attributes)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^"'>\s]+)/gim, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gim, '');
  
  // Remove data: protocol (except for images)
  sanitized = sanitized.replace(/data:(?!image\/)/gim, '');
  
  return sanitized;
}

/**
 * Sanitize user input for text fields
 * Removes potentially dangerous characters
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(input: string): string {
  if (!input) return '';
  
  const sanitized = input.trim().toLowerCase();
  
  // Allow only email-safe characters
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(input: string): string {
  if (!input) return '';
  
  // Remove all non-numeric characters except + for country code
  const sanitized = input.replace(/[^\d+]/g, '');
  
  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeURL(input: string): string {
  if (!input) return '';
  
  const sanitized = input.trim();
  
  // Allow only http, https protocols
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    return '';
  }
  
  try {
    const url = new URL(sanitized);
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize JSON input
 */
export function sanitizeJSON(input: string): string {
  if (!input) return '';
  
  try {
    const parsed = JSON.parse(input);
    // Recursively sanitize all string values in the object
    const sanitized = sanitizeObject(parsed);
    return JSON.stringify(sanitized);
  } catch {
    return '';
  }
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate and sanitize file upload
 */
export function sanitizeFileName(input: string): string {
  if (!input) return '';
  
  // Remove path information (keep only filename)
  let sanitized = input.split(/[\\/]/).pop() || '';
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit filename length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }
  
  return sanitized.trim();
}

/**
 * Escape HTML entities
 */
export function escapeHTML(input: string): string {
  if (!input) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };
  
  return input.replace(/[&<>"']/g, (char) => map[char]);
}
