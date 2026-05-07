// Centralized Logging Utility
// Provides structured logging with levels and context

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogContext {
  traceId?: string;
  userId?: string;
  requestId?: string;
  operation?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  critical(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.CRITICAL, message, context, error);
  }

  // Security event logging
  security(event: string, details: LogContext): void {
    this.info(`SECURITY: ${event}`, { ...details, category: 'security' });
  }

  // Audit event logging
  audit(action: string, resource: string, details: LogContext): void {
    this.info(`AUDIT: ${action} on ${resource}`, { ...details, category: 'audit' });
  }

  // Performance logging
  performance(operation: string, durationMs: number, context?: LogContext): void {
    this.debug(`PERFORMANCE: ${operation} took ${durationMs}ms`, { ...context, category: 'performance', durationMs });
  }
}

export const logger = Logger.getInstance();

// Convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => logger.error(message, error, context),
  critical: (message: string, error?: Error, context?: LogContext) => logger.critical(message, error, context),
  security: (event: string, details: LogContext) => logger.security(event, details),
  audit: (action: string, resource: string, details: LogContext) => logger.audit(action, resource, details),
  performance: (operation: string, durationMs: number, context?: LogContext) => logger.performance(operation, durationMs, context)
};
