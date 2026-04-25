// Rate Limiting Middleware
// Provides in-memory rate limiting for API endpoints

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, skipSuccessfulRequests = false } = options;

  return async (request: Request, identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> => {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    // Clean up expired records
    if (record && record.resetTime < now) {
      rateLimitStore.delete(identifier);
    }

    const currentRecord = rateLimitStore.get(identifier) || { count: 0, resetTime: now + windowMs };
    
    // Reset if window expired
    if (currentRecord.resetTime < now) {
      currentRecord.count = 0;
      currentRecord.resetTime = now + windowMs;
    }

    // Increment counter
    currentRecord.count++;
    rateLimitStore.set(identifier, currentRecord);

    const remaining = Math.max(0, maxRequests - currentRecord.count);
    const success = currentRecord.count <= maxRequests;

    return {
      success,
      limit: maxRequests,
      remaining,
      reset: currentRecord.resetTime
    };
  };
}

// Get client identifier from request
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const headers = request.headers as any;
  const ip = headers.get('x-forwarded-for')?.split(',')[0] ||
              headers.get('x-real-ip') ||
              headers.get('cf-connecting-ip') ||
              'unknown';
  
  return `ip:${ip}`;
}

// Rate limit middleware for Next.js API routes
export async function withRateLimit(
  request: Request,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | null> {
  const identifier = getClientIdentifier(request);
  const limiter = rateLimit(options);
  return await limiter(request, identifier);
}

// Predefined rate limit configurations
export const rateLimits = {
  // Strict limits for authentication endpoints
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  
  // Standard limits for general API endpoints
  standard: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  
  // Lenient limits for public endpoints
  public: { windowMs: 60 * 1000, maxRequests: 200 }, // 200 requests per minute
  
  // Strict limits for sensitive operations
  strict: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute
};
