import { logger } from './logger';

let sentryInitialized = false;
let Sentry: any = null;

async function loadSentry() {
  if (Sentry) return Sentry;
  try {
    // Use Function constructor to avoid TypeScript module resolution at build time
    const sentryModule = await (new Function('return import("@sentry/nextjs")')());
    Sentry = sentryModule;
    return Sentry;
  } catch {
    logger.warn('[Sentry] @sentry/nextjs not installed; using fallback logging.');
    return null;
  }
}

export async function initSentry() {
  if (sentryInitialized) return;
  if (!process.env.SENTRY_DSN) {
    logger.info('[Sentry] SENTRY_DSN not configured; skipping Sentry initialization.');
    return;
  }

  const sentry = await loadSentry();
  if (!sentry) return;

  sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.CF_PAGES_COMMIT_SHA || 'unknown',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event: any) {
      if (event.request) {
        const headers = event.request.headers || {};
        delete headers['cookie'];
        delete headers['authorization'];
        delete headers['x-api-key'];
      }
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });

  sentryInitialized = true;
}

export async function captureException(error: Error, context?: Record<string, any>) {
  logger.error('Exception captured', error, context);
  if (!sentryInitialized) await initSentry();
  if (Sentry) {
    Sentry.captureException(error, { extra: context });
  }
}

export async function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info') {
  logger.info(`Sentry message: ${message}`, { level });
  if (!sentryInitialized) await initSentry();
  if (Sentry) {
    Sentry.captureMessage(message, level);
  }
}

export async function setUser(user: { id: string; email?: string; username?: string }) {
  if (!sentryInitialized) await initSentry();
  if (Sentry) {
    Sentry.setUser(user);
  }
}

export async function clearUser() {
  if (!sentryInitialized) await initSentry();
  if (Sentry) {
    Sentry.setUser(null);
  }
}
