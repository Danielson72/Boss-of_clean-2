/**
 * Structured Logger Utility for Boss of Clean
 *
 * Features:
 * - Log levels: debug, info, warn, error
 * - Environment-aware: silent for debug/info in production
 * - Timestamps and context support
 * - Consistent formatting
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  file?: string;
  function?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = process.env.NODE_ENV === 'production';
const MIN_LEVEL = isProduction ? LOG_LEVELS.warn : LOG_LEVELS.debug;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatContext(context?: LogContext): string {
  if (!context) return '';

  const parts: string[] = [];
  if (context.file) parts.push(context.file);
  if (context.function) parts.push(context.function);

  const contextStr = parts.length > 0 ? `[${parts.join(':')}]` : '';

  // Include any additional context properties
  const additionalKeys = Object.keys(context).filter(k => k !== 'file' && k !== 'function');
  if (additionalKeys.length > 0) {
    const additional = additionalKeys.reduce((acc, key) => {
      acc[key] = context[key];
      return acc;
    }, {} as Record<string, unknown>);
    return contextStr + (contextStr ? ' ' : '') + JSON.stringify(additional);
  }

  return contextStr;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = formatTimestamp();
  const contextStr = formatContext(context);
  const levelStr = level.toUpperCase().padEnd(5);

  return `${timestamp} ${levelStr} ${contextStr}${contextStr ? ' ' : ''}${message}`;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= MIN_LEVEL;
}

function log(level: LogLevel, message: string, context?: LogContext, ...args: unknown[]): void {
  if (!shouldLog(level)) return;

  const formattedMessage = formatMessage(level, message, context);

  switch (level) {
    case 'debug':
    case 'info':
      if (args.length > 0) {
        console.log(formattedMessage, ...args);
      } else {
        console.log(formattedMessage);
      }
      break;
    case 'warn':
      if (args.length > 0) {
        console.warn(formattedMessage, ...args);
      } else {
        console.warn(formattedMessage);
      }
      break;
    case 'error':
      if (args.length > 0) {
        console.error(formattedMessage, ...args);
      } else {
        console.error(formattedMessage);
      }
      break;
  }
}

/**
 * Create a logger instance with a predefined context (file/module name)
 */
export function createLogger(context: LogContext) {
  return {
    debug: (message: string, additionalContext?: Omit<LogContext, 'file'>, ...args: unknown[]) =>
      log('debug', message, { ...context, ...additionalContext }, ...args),
    info: (message: string, additionalContext?: Omit<LogContext, 'file'>, ...args: unknown[]) =>
      log('info', message, { ...context, ...additionalContext }, ...args),
    warn: (message: string, additionalContext?: Omit<LogContext, 'file'>, ...args: unknown[]) =>
      log('warn', message, { ...context, ...additionalContext }, ...args),
    error: (message: string, additionalContext?: Omit<LogContext, 'file'>, ...args: unknown[]) =>
      log('error', message, { ...context, ...additionalContext }, ...args),
  };
}

/**
 * Default logger for quick usage without context
 */
export const logger = {
  debug: (message: string, context?: LogContext, ...args: unknown[]) =>
    log('debug', message, context, ...args),
  info: (message: string, context?: LogContext, ...args: unknown[]) =>
    log('info', message, context, ...args),
  warn: (message: string, context?: LogContext, ...args: unknown[]) =>
    log('warn', message, context, ...args),
  error: (message: string, context?: LogContext, ...args: unknown[]) =>
    log('error', message, context, ...args),
};

export default logger;
