import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { getDb } from "./db";

// Better Auth configuration
// Note: dash plugin removed - requires Better Auth dashboard setup
// Can be added later if dashboard is needed
// Using better-auth-cloudflare for D1 integration
const db = getDb();

export const auth = betterAuth({
  ...withCloudflare(
    {
      d1Native: db as any,
    },
    {
      baseURL: process.env.BETTER_AUTH_URL || (() => {
        throw new Error('BETTER_AUTH_URL environment variable must be set');
      })(),
      secret: process.env.BETTER_AUTH_SECRET || (() => {
        throw new Error('BETTER_AUTH_SECRET environment variable must be set');
      })(),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        sendResetPassword: async () => {
          // Custom email sending logic can be added here
        },
      },
      session: {
        expiresIn: 60 * 60 * 24, // 24 hours
        updateAge: 60 * 60 * 12, // 12 hours
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60, // 5 minutes
        },
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
    }
  ),
});
