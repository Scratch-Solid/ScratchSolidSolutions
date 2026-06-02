/**
 * Structured Logging with Pino
 * Production-ready logging with structured output
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

export default logger;

/**
 * Child logger with context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * HTTP request logger
 */
export function logHttpRequest(req: Request, responseTime?: number) {
  logger.info({
    type: 'http_request',
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
    responseTime,
  });
}

/**
 * HTTP error logger
 */
export function logHttpError(req: Request, error: Error, statusCode?: number) {
  logger.error({
    type: 'http_error',
    method: req.method,
    url: req.url,
    statusCode,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
}

/**
 * Database query logger
 */
export function logDbQuery(query: string, params?: unknown[], duration?: number) {
  logger.debug({
    type: 'db_query',
    query,
    params,
    duration,
  });
}

/**
 * Security event logger
 */
export function logSecurityEvent(event: string, details: Record<string, unknown>) {
  logger.warn({
    type: 'security_event',
    event,
    ...details,
  });
}
