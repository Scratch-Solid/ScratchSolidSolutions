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

// Legacy sync export for backward compatibility (uses defaults to prevent module-level crashes)
export const config: AppConfig = {
  // Security - use defaults to prevent module-level crashes
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  csrfSecret: process.env.CSRF_SECRET || 'fallback-secret',
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
export async function validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const cfg = await getConfig();
  
  // Validate required fields
  if (!cfg.jwtSecret || cfg.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }
  
  if (!cfg.csrfSecret || cfg.csrfSecret.length < 32) {
    errors.push('CSRF_SECRET must be at least 32 characters');
  }
  
  // Validate numeric ranges
  if (cfg.sessionTimeoutHours < 1 || cfg.sessionTimeoutHours > 168) {
    errors.push('SESSION_TIMEOUT_HOURS must be between 1 and 168 (7 days)');
  }
  
  if (cfg.maxConcurrentSessions < 1 || cfg.maxConcurrentSessions > 10) {
    errors.push('MAX_CONCURRENT_SESSIONS must be between 1 and 10');
  }
  
  if (cfg.rateLimitWindowMs < 1000 || cfg.rateLimitWindowMs > 3600000) {
    errors.push('RATE_LIMIT_WINDOW_MS must be between 1000 and 3600000 (1 hour)');
  }
  
  if (cfg.rateLimitMaxRequests < 1 || cfg.rateLimitMaxRequests > 1000) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be between 1 and 1000');
  }
  
  if (cfg.maxFailedAttempts < 3 || cfg.maxFailedAttempts > 10) {
    errors.push('MAX_FAILED_ATTEMPTS must be between 3 and 10');
  }
  
  if (cfg.lockoutDurationMinutes < 5 || cfg.lockoutDurationMinutes > 1440) {
    errors.push('LOCKOUT_DURATION_MINUTES must be between 5 and 1440 (24 hours)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Get configuration for client-side use (safe values only)
export async function getClientConfig(): Promise<Record<string, string | boolean | number>> {
  const cfg = await getConfig();
  return {
    allowedOrigins: cfg.allowedOrigins,
    isProduction: cfg.isProduction,
    sessionTimeoutHours: cfg.sessionTimeoutHours,
    maxConcurrentSessions: cfg.maxConcurrentSessions,
  };
}

// Remove import-time validation to prevent crashes
