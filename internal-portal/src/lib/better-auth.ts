import { betterAuth } from "better-auth";
import { D1Adapter } from "better-auth/adapters/d1";

// Better Auth configuration
// Note: dash plugin removed - requires Better Auth dashboard setup
// Can be added later if dashboard is needed
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || (() => {
    throw new Error('BETTER_AUTH_URL environment variable must be set');
  })(),
  secret: process.env.BETTER_AUTH_SECRET || (() => {
    throw new Error('BETTER_AUTH_SECRET environment variable must be set');
  })(),
  database: new D1Adapter(process.env.DB as any),
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60 * 12, // 12 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
    maxAge: 60 * 60 * 24, // 24 hours
    concurrentSessions: {
      enabled: true,
      maxSessions: 3, // Maximum concurrent sessions per user
      strategy: 'revoke_old' // Revoke oldest sessions when limit exceeded
    }
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  socialProviders: {
    // Configure social providers as needed
  },
  twoFactor: {
    // Enable 2FA
    totp: {
      issuer: "ScratchSolid",
      algorithm: "SHA256",
      digits: 6,
      period: 30,
    },
    backupCode: {
      enabled: true,
      length: 12,
      characters: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    },
  },
});
