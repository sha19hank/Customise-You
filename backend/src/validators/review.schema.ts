// backend/src/validators/review.schema.ts

import { z } from 'zod';
import { nonEmptyStringSchema, ratingSchema, uuidSchema } from './common.schema';

// Review schema kept strict for future route validation usage.
export const createReviewBodySchema = z
  .object({
    userId: uuidSchema,
    productId: uuidSchema,
    orderId: uuidSchema.optional(),
    rating: ratingSchema,
    title: nonEmptyStringSchema,
    content: nonEmptyStringSchema,
    customizationQualityRating: ratingSchema.optional(),
    images: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();
