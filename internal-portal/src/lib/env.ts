/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
}

const ENV_CONFIG: EnvVarConfig[] = [
  { name: 'JWT_SECRET', required: true, validator: (v) => v.length >= 32 },
  { name: 'CSRF_SECRET', required: true, validator: (v) => v.length >= 32 },
  { name: 'RESEND_API_KEY', required: false },
  { name: 'ZOHO_CLIENT_ID', required: false },
  { name: 'ZOHO_CLIENT_SECRET', required: false },
  { name: 'ZOHO_ORG_ID', required: false },
  { name: 'ZOHO_REFRESH_TOKEN', required: false },
  { name: 'TWILIO_ACCOUNT_SID', required: false },
  { name: 'TWILIO_AUTH_TOKEN', required: false },
  { name: 'TWILIO_WHATSAPP_NUMBER', required: false },
  { name: 'NEXT_PUBLIC_BUSINESS_DASHBOARD_URL', required: false },
];

const errors: string[] = [];
const warnings: string[] = [];

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  ENV_CONFIG.forEach(config => {
    const value = process.env[config.name];
    
    if (config.required && !value) {
      errors.push(`Required environment variable ${config.name} is missing`);
      return;
    }
    
    if (!value && config.defaultValue) {
      process.env[config.name] = config.defaultValue;
      warnings.push(`Using default value for ${config.name}`);
      return;
    }
    
    if (value && config.validator && !config.validator(value)) {
      errors.push(`Environment variable ${config.name} is invalid`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value && !fallback) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || fallback!;
}

export function getEnvVarOptional(name: string): string | undefined {
  return process.env[name];
}

// Validate on import
const validation = validateEnv();
if (!validation.valid && process.env.NODE_ENV === 'production') {
  console.error('Environment validation failed:', validation.errors);
  throw new Error('Invalid environment configuration');
}

if (validation.warnings.length > 0) {
  console.warn('Environment warnings:', validation.warnings);
}
