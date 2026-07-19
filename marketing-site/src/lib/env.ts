// Environment Variable Validation
// Ensures all required environment variables are set before the application starts
// Cloudflare Workers secrets are accessed via getCloudflareContext({ async: true }).env
// process.env only contains vars from wrangler.jsonc, NOT secrets set via wrangler secret put

import { getCloudflareContext } from './runtime-context';

interface EnvConfig {
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  NEXT_PUBLIC_BASE_URL: string;
  NEXT_PUBLIC_API_URL: string;
  ZOHO_ORG_ID?: string;
  ZOHO_CLIENT_ID?: string;
  ZOHO_CLIENT_SECRET?: string;
  ZOHO_REFRESH_TOKEN?: string;
  ZOHO_DC?: string;
}

export function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Required vars from wrangler.jsonc (NOT secrets — secrets are read via getCloudflareSecret)
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    errors.push('NEXT_PUBLIC_BASE_URL is required for generating links');
  }

  if (!process.env.NEXT_PUBLIC_API_URL) {
    errors.push('NEXT_PUBLIC_API_URL is required for API calls');
  }

  // Optional environment variables (log warnings if missing in production)
  if (process.env.NODE_ENV === 'production') {
    // Zoho credentials for payment integration
    if (!process.env.ZOHO_ORG_ID || !process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
      console.warn('Zoho Books credentials are recommended in production for payment integration');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Missing required environment variables:\n${errors.join('\n')}`);
  }

  return {
    JWT_SECRET: '', // secrets read via getJWTSecret()
    RESEND_API_KEY: '', // secrets read via getResendApiKey()
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "https://scratchsolidsolutions.org",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://api.scratchsolidsolutions.org/api",
    ZOHO_ORG_ID: process.env.ZOHO_ORG_ID,
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
    ZOHO_DC: process.env.ZOHO_DC
  };
}

/** Read a secret from the Cloudflare Worker environment (wrangler secrets) with process.env fallback. */
async function getCloudflareSecret(name: string): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    return (env as any)?.[name] || process.env[name];
  } catch {
    return process.env[name];
  }
}

export function getEnv(): EnvConfig {
  try {
    return validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw error;
  }
}

export async function getJWTSecret(): Promise<string> {
  const secret = await getCloudflareSecret('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export async function getResendApiKey(): Promise<string> {
  const apiKey = await getCloudflareSecret('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }
  return apiKey;
}

export async function getAnthropicApiKey(): Promise<string> {
  const apiKey = await getCloudflareSecret('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  return apiKey;
}

export function getZohoCredentials(): { orgId: string; clientId: string; clientSecret: string; refreshToken: string; dc?: string } {
  const orgId = process.env.ZOHO_ORG_ID;
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  
  if (!orgId || !clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho Books credentials are required for payment integration');
  }
  
  return { orgId, clientId, clientSecret, refreshToken, dc: process.env.ZOHO_DC };
}
