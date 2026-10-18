export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  module?: string;
  [key: string]: any;
}

export class Logger {
  private static currentContext: LogContext = {};

  public static setGlobalContext(ctx: LogContext): void {
    this.currentContext = { ...this.currentContext, ...ctx };
  }

  public static debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  public static info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  public static warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  public static error(message: string, error?: any, meta?: Record<string, any>): void {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    this.log(LogLevel.ERROR, message, { ...meta, error: errorDetails });
  }

  private static log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.currentContext, ...meta }
    };

    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod') {
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      const color = level === LogLevel.ERROR ? '\x1b[31m' : level === LogLevel.WARN ? '\x1b[33m' : level === LogLevel.INFO ? '\x1b[32m' : '\x1b[36m';
      const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      process.stdout.write(`${color}[${entry.timestamp}] [${level}]\x1b[0m ${message}${metaStr}\n`);
    }
  }
}
