import { betterAuth } from "better-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Better Auth configuration
// Note: dash plugin removed - requires Better Auth dashboard setup
// Can be added later if dashboard is needed
// Using native Better-Auth database configuration
// Create auth instance function to handle async database initialization
export async function createAuth() {
  const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
  const envAny = env as any;
  
  // Get D1 database binding
  const db = envAny?.scratchsolid_db || envAny?.scratchsolidDb || envAny?.scratchsolid_db_portal_staging || envAny?.DB || envAny?.db || envAny?.database;
  
  if (!db) {
    throw new Error('D1 database binding not found');
  }

  console.log('D1 database found:', !!db);
  console.log('D1 database type:', typeof db);
  console.log('D1 database has prepare:', typeof (db as any).prepare);

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || (() => {
      throw new Error('BETTER_AUTH_URL environment variable must be set');
    })(),
    secret: process.env.BETTER_AUTH_SECRET || (() => {
      throw new Error('BETTER_AUTH_SECRET environment variable must be set');
    })(),
    database: db,
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
  });
}

// Export a default auth instance for non-async contexts (will be initialized lazily)
let authInstance: any = null;
export const auth = new Proxy({} as any, {
  get(target, prop) {
    if (!authInstance) {
      // For now, throw an error to force using createAuth()
      throw new Error('Auth not initialized. Use createAuth() to get an auth instance.');
    }
    return authInstance[prop];
  },
});
