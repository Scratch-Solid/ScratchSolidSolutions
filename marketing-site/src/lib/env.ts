// Environment Variable Validation
// Ensures all required environment variables are set before the application starts

import { getCloudflareContext } from '@opennextjs/aws/cloudflare';

interface EnvConfig {
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  NEXT_PUBLIC_BASE_URL: string;
  NEXT_PUBLIC_API_URL: string;
  ZOHO_ORG_ID?: string;
  ZOHO_CLIENT_ID?: string;
  ZOHO_CLIENT_SECRET?: string;
  ZOHO_REFRESH_TOKEN?: string;
}

export function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Required environment variables
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required for authentication');
  }

  if (!process.env.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY is required for email functionality');
  }

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
    JWT_SECRET: process.env.JWT_SECRET!,
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    NEXT_PUBLIC_BASE_URL: "https://scratchsolidsolutions.org",
    NEXT_PUBLIC_API_URL: "https://api.scratchsolidsolutions.org/api",
    ZOHO_ORG_ID: process.env.ZOHO_ORG_ID,
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN
  };
}

export function getEnv(): EnvConfig {
  try {
    return validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw error;
  }
}

export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export async function getResendApiKey(): Promise<string> {
  // Use exact same pattern as getDb() for consistency
  try {
    const { env } = await getCloudflareContext({ async: true });
    const apiKey = env?.RESEND_API_KEY;
    
    if (apiKey) {
      return apiKey;
    }
  } catch (error) {
    console.error('Error getting RESEND_API_KEY from Cloudflare context:', error);
  }
  
  // Fallback to process.env for local development
  if (typeof process !== 'undefined' && process.env?.RESEND_API_KEY) {
    return process.env.RESEND_API_KEY;
  }
  
  throw new Error('RESEND_API_KEY environment variable is required');
}

export function getZohoCredentials(): { orgId: string; clientId: string; clientSecret: string; refreshToken: string } {
  const orgId = process.env.ZOHO_ORG_ID;
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  
  if (!orgId || !clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho Books credentials are required for payment integration');
  }
  
  return { orgId, clientId, clientSecret, refreshToken };
}
