// backend/src/middleware/errorHandler.ts - Global Error Handler Middleware

import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import Winston from 'winston';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

// Default logger for direct error handler export
const defaultLogger = Winston.createLogger({
  transports: [new Winston.transports.Console()],
});

export function createErrorHandler(logger: Logger) {
  return (err: ApiError, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    const code = err.code || 'INTERNAL_ERROR';

    logger.error({
      message: `Error: ${message}`,
      status,
      code,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(status).json({
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  };
}

export class ValidationError extends Error implements ApiError {
  status = 400;
  code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements ApiError {
  status = 401;
  code = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements ApiError {
  status = 403;
  code = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  status = 404;
  code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  status = 409;
  code = 'CONFLICT';

  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error implements ApiError {
  status = 429;
  code = 'RATE_LIMIT_EXCEEDED';

  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}
// Export a default error handler using the default logger
export const errorHandler = createErrorHandler(defaultLogger);