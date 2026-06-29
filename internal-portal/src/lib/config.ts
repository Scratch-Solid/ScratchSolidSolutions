// Configuration Management
// Centralized configuration with validation and defaults

export interface AppConfig {
  // Session
  sessionTimeoutHours: number;
  maxConcurrentSessions: number;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // Account Lockout
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  
  // CORS
  allowedOrigins: string;
  
  // Database
  databaseUrl?: string;
  
  // Environment
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

function getEnvVar(name: string, defaultValue?: string): string {
  return process.env[name] || defaultValue || '';
}

export const config: AppConfig = {
  // Session
  sessionTimeoutHours: parseInt(getEnvVar('SESSION_TIMEOUT_HOURS', '24'), 10),
  maxConcurrentSessions: parseInt(getEnvVar('MAX_CONCURRENT_SESSIONS', '3'), 10),
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  rateLimitMaxRequests: parseInt(getEnvVar('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  
  // Account Lockout
  maxFailedAttempts: parseInt(getEnvVar('MAX_FAILED_ATTEMPTS', '5'), 10),
  lockoutDurationMinutes: parseInt(getEnvVar('LOCKOUT_DURATION_MINUTES', '15'), 10),
  
  // CORS
  allowedOrigins: getEnvVar('ALLOWED_ORIGINS', '*'),
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // Environment
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
};

// Configuration validation function
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate numeric ranges
  if (config.sessionTimeoutHours < 1 || config.sessionTimeoutHours > 168) {
    errors.push('SESSION_TIMEOUT_HOURS must be between 1 and 168 (7 days)');
  }
  
  if (config.maxConcurrentSessions < 1 || config.maxConcurrentSessions > 10) {
    errors.push('MAX_CONCURRENT_SESSIONS must be between 1 and 10');
  }
  
  if (config.rateLimitWindowMs < 1000 || config.rateLimitWindowMs > 3600000) {
    errors.push('RATE_LIMIT_WINDOW_MS must be between 1000 and 3600000 (1 hour)');
  }
  
  if (config.rateLimitMaxRequests < 1 || config.rateLimitMaxRequests > 1000) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be between 1 and 1000');
  }
  
  if (config.maxFailedAttempts < 3 || config.maxFailedAttempts > 10) {
    errors.push('MAX_FAILED_ATTEMPTS must be between 3 and 10');
  }
  
  if (config.lockoutDurationMinutes < 5 || config.lockoutDurationMinutes > 1440) {
    errors.push('LOCKOUT_DURATION_MINUTES must be between 5 and 1440 (24 hours)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Get configuration for client-side use (safe values only)
export function getClientConfig(): Record<string, string | boolean | number> {
  return {
    allowedOrigins: config.allowedOrigins,
    isProduction: config.isProduction,
    sessionTimeoutHours: config.sessionTimeoutHours,
    maxConcurrentSessions: config.maxConcurrentSessions,
  };
}

