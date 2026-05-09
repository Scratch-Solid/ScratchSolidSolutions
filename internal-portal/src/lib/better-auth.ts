import { betterAuth } from "better-auth";

export const auth = betterAuth({
  providers: [
    // Add providers as needed
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
    maxAge: 60 * 60 * 24 * 7, // 7 days
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
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    },
    backupCode: {
      enabled: true,
      length: 10,
      characters: "0123456789",
    },
  },
});
