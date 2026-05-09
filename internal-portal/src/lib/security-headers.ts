/**
 * Security Headers Middleware
 * Adds security headers to all API responses
 */

export interface SecurityHeaders {
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security'?: string;
  'Content-Security-Policy'?: string;
}

/**
 * Get standard security headers for API responses
 */
export function getSecurityHeaders(isProduction: boolean = false): SecurityHeaders {
  const headers: SecurityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };

  // Add HSTS only in production
  if (isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  // CSP for API endpoints (relaxed for API, strict for web)
  headers['Content-Security-Policy'] = isProduction
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.scratchsolidsolutions.org"
    : "default-src 'self' *; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self' data:; connect-src 'self' *";

  return headers;
}

/**
 * Add security headers to a Response object
 */
export function addSecurityHeaders(response: Response, isProduction: boolean = false): Response {
  const headers = getSecurityHeaders(isProduction);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Get API-specific security headers (more relaxed for API endpoints)
 */
export function getAPISecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN', // Allow same origin for API
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}
