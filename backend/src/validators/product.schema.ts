// backend/src/validators/product.schema.ts

import { z } from 'zod';
import { nonEmptyStringSchema, positiveNumberSchema, positiveIntSchema, uuidSchema } from './common.schema';

// Product schemas prepared for future validation coverage.
export const productIdParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const createProductBodySchema = z
  .object({
    name: nonEmptyStringSchema,
    description: nonEmptyStringSchema.optional(),
    categoryId: uuidSchema.optional(),
    basePrice: positiveNumberSchema,
    quantityAvailable: positiveIntSchema,
  })
  .strict();
