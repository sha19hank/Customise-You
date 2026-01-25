// backend/src/validators/common.schema.ts

import { z } from 'zod';

// Common reusable schema fragments kept strict and explicit.
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const nonEmptyStringSchema = z.string().min(1, 'Field is required');
export const currencySchema = z
  .string()
  .regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter code');
export const phoneSchema = z
  .string()
  .min(7, 'Phone number is too short')
  .max(20, 'Phone number is too long');
export const positiveIntSchema = z.number().int().positive('Value must be a positive integer');
export const positiveNumberSchema = z.number().positive('Value must be a positive number');
export const ratingSchema = z.number().int().min(1).max(5);
