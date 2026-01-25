// backend/src/validators/payment.schema.ts

import { z } from 'zod';
import { currencySchema, nonEmptyStringSchema, positiveNumberSchema, uuidSchema } from './common.schema';

export const createPaymentIntentBodySchema = z
  .object({
    orderId: uuidSchema,
    amount: positiveNumberSchema,
    currency: currencySchema,
    paymentMethod: z.enum(['stripe', 'razorpay', 'paypal', 'cod']),
    paymentMethodId: nonEmptyStringSchema.optional(),
  })
  .strict();

export const confirmPaymentBodySchema = z
  .object({
    orderId: uuidSchema,
    transactionId: nonEmptyStringSchema,
  })
  .strict();
