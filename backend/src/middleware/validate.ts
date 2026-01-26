// backend/src/middleware/validate.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

interface ValidationDetail {
  field: string;
  message: string;
}

const formatZodError = (error: ZodError): ValidationDetail[] =>
  error.errors.map((issue: ZodError['errors'][number]) => ({
    // Use dot notation for nested fields; fallback to 'root' when path is empty.
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));

const sendValidationError = (res: Response, error: ZodError) => {
  const details = formatZodError(error);
  const fieldErrors = details.map(d => `${d.field}: ${d.message}`).join(', ');
  
  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${fieldErrors}`,
      details: details,
    },
  });
};

export const validateBody = <TSchema extends ZodTypeAny>(schema: TSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Parse and strip to the schema shape; reject on any extra properties.
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    // Replace body with validated payload to avoid leaking unknown fields.
    req.body = result.data as Request['body'];
    return next();
  };

export const validateParams = <TSchema extends ZodTypeAny>(schema: TSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Validate route params (always strings) against a strict schema.
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    req.params = result.data as Request['params'];
    return next();
  };

export const validateQuery = <TSchema extends ZodTypeAny>(schema: TSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Validate querystring data before it reaches controllers.
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return sendValidationError(res, result.error);
    }

    req.query = result.data as Request['query'];
    return next();
  };
