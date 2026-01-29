/**
 * Logger utility for frontend components
 * Provides structured logging with emoji prefixes for different log levels
 */

export interface Logger {
  info: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
  warn: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
}

/**
 * Create a logger instance for a specific component/module
 * @param moduleName - Name of the component/module using the logger
 * @returns Logger instance with info, error, warn, debug methods
 */
export function createLogger(moduleName: string): Logger {
  return {
    info: (message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.log(
        `%c[${timestamp}] ✅ ${moduleName}: ${message}`,
        'color: #22c55e; font-weight: bold;',
        data
      );
    },

    error: (message: string, error?: any) => {
      const timestamp = new Date().toISOString();
      console.error(
        `%c[${timestamp}] ❌ ${moduleName}: ${message}`,
        'color: #ef4444; font-weight: bold;',
        error
      );
    },

    warn: (message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.warn(
        `%c[${timestamp}] ⚠️ ${moduleName}: ${message}`,
        'color: #eab308; font-weight: bold;',
        data
      );
    },

    debug: (message: string, data?: any) => {
      const timestamp = new Date().toISOString();
      console.debug(
        `%c[${timestamp}] 🔍 ${moduleName}: ${message}`,
        'color: #3b82f6; font-weight: bold;',
        data
      );
    },
  };
}

/**
 * Global logger instance
 * Use for application-level logging
 */
export const globalLogger = createLogger('BROMS');
