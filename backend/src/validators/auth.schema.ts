// backend/src/validators/auth.schema.ts

import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema, nonEmptyStringSchema, uuidSchema } from './common.schema';

// Auth payloads are strict to prevent unexpected fields from reaching services.
export const registerBodySchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema.optional(),
    firstName: nonEmptyStringSchema,
    lastName: nonEmptyStringSchema,
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const changePasswordBodySchema = z
  .object({
    userId: uuidSchema,
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
  })
  .strict();

export const resetPasswordBodySchema = z
  .object({
    resetToken: nonEmptyStringSchema,
    newPassword: passwordSchema,
  })
  .strict();
