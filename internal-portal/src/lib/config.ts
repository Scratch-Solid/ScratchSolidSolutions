// Configuration Management
// Centralized configuration with validation and defaults
// Fixed: Use Cloudflare context to access secrets in Workers

import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface AppConfig {
  // Security
  jwtSecret: string;
  csrfSecret: string;
  seedKey?: string;
  
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

function validateRequired(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Required configuration missing: ${name}`);
  }
  return value;
}

function getEnvVar(name: string, defaultValue?: string): string {
  return process.env[name] || defaultValue || '';
}

// Lazy load config with Cloudflare context support
let cachedConfig: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  let jwtSecret = '';
  let csrfSecret = '';
  let seedKey = '';

  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env) {
      // Access secrets from Cloudflare environment
      jwtSecret = (env.JWT_SECRET as string) || process.env.JWT_SECRET || '';
      csrfSecret = (env.CSRF_SECRET as string) || process.env.CSRF_SECRET || '';
      seedKey = (env.SEED_KEY as string) || process.env.SEED_KEY || '';
    }
  } catch (error) {
    // Fallback to process.env if Cloudflare context not available
    jwtSecret = process.env.JWT_SECRET || '';
    csrfSecret = process.env.CSRF_SECRET || '';
    seedKey = process.env.SEED_KEY || '';
  }
  
  cachedConfig = {
    // Security
    jwtSecret: validateRequired(jwtSecret, 'JWT_SECRET'),
    csrfSecret: validateRequired(csrfSecret, 'CSRF_SECRET'),
    seedKey,
    
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
  
  return cachedConfig;
}

// Legacy sync export for backward compatibility (uses fallback)
export const config: AppConfig = {
  // Security
  jwtSecret: validateRequired(process.env.JWT_SECRET, 'JWT_SECRET'),
  csrfSecret: validateRequired(process.env.CSRF_SECRET, 'CSRF_SECRET'),
  seedKey: process.env.SEED_KEY,
  
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
  
  // Validate required fields
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }
  
  if (!config.csrfSecret || config.csrfSecret.length < 32) {
    errors.push('CSRF_SECRET must be at least 32 characters');
  }
  
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

// Validate configuration on import
if (typeof window === 'undefined') {
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('Configuration validation failed:', validation.errors);
    // Don't throw error at import time - log warning instead
    console.warn('Running with invalid configuration - check environment variables');
  }
}
