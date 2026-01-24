// backend/src/middleware/requestLogger.ts - Request Logging Middleware

import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import Winston from 'winston';

// Default logger for direct requestLogger export
const defaultLogger = Winston.createLogger({
  transports: [new Winston.transports.Console()],
  format: Winston.format.combine(
    Winston.format.timestamp(),
    Winston.format.json()
  ),
});

export function createRequestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const { method, url, ip } = req;

    // Log when response is finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logData = {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        ip,
        timestamp: new Date().toISOString(),
      };

      if (statusCode >= 400) {
        logger.warn(logData);
      } else {
        logger.info(logData);
      }
    });

    next();
  };
}

// Export a default request logger using the default logger
export const requestLogger = createRequestLogger(defaultLogger);
