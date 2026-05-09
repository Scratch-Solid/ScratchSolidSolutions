/**
 * Rate Limiter for API Endpoints
 * Protects against brute force attacks and API abuse
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number = 60000, // 1 minute window
    private maxRequests: number = 100, // max requests per window
    private cleanupMs: number = 300000 // cleanup every 5 minutes
  ) {
    // Periodically clean up expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupMs);
  }

  /**
   * Check if a request should be rate limited
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store[identifier];

    if (!entry || now > entry.resetTime) {
      // First request or window expired, reset
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs
      };
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: this.store[identifier].resetTime
      };
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  /**
   * Get rate limit headers
   */
  getHeaders(identifier: string): {
    'X-RateLimit-Limit': string;
    'X-RateLimit-Remaining': string;
    'X-RateLimit-Reset': string;
  } {
    const result = this.check(identifier);
    return {
      'X-RateLimit-Limit': this.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    };
  }

  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Create rate limiters for different endpoint types
export const authRateLimiter = new RateLimiter(60000, 5); // 5 requests per minute for auth
export const generalRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute for general
export const strictRateLimiter = new RateLimiter(60000, 20); // 20 requests per minute for sensitive operations

export default RateLimiter;
