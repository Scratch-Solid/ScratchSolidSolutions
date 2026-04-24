// Logger utility for Cloudflare Workers
// Simple logging interface that works with Cloudflare Workers runtime

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private context: string;

  constructor(context: string = 'app') {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context ? { ...context, source: this.context } : { source: this.context }
    };
  }

  private log(entry: LogEntry): void {
    const logMessage = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context?.source}] ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 1) {
      console.log(logMessage, JSON.stringify(entry.context));
    } else {
      console.log(logMessage);
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, error?: Error | Record<string, any>): void {
    const context = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : error;
    this.log(this.formatMessage(LogLevel.ERROR, message, context));
  }
}

// Create a default logger instance
export const logger = new Logger();

// Factory function to create loggers with specific context
export function createLogger(context: string): Logger {
  return new Logger(context);
}
