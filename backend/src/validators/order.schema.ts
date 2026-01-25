// backend/src/validators/order.schema.ts

import { z } from 'zod';
import {
  nonEmptyStringSchema,
  positiveIntSchema,
  uuidSchema,
} from './common.schema';

const cartItemSchema = z
  .object({
    productId: uuidSchema,
    quantity: positiveIntSchema,
    // Customization payloads can be any JSON; keep flexible but typed.
    customizations: z.record(z.any()).optional().default({}),
  })
  .strict();

export const createOrderBodySchema = z
  .object({
    userId: uuidSchema,
    cartItems: z.array(cartItemSchema).min(1, 'At least one cart item is required'),
    shippingAddressId: uuidSchema,
    billingAddressId: uuidSchema.optional(),
    shippingMethod: nonEmptyStringSchema.optional(),
    paymentMethod: nonEmptyStringSchema,
    couponCode: nonEmptyStringSchema.optional(),
  })
  .strict();

export const orderIdParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'completed',
]);

export const updateOrderStatusBodySchema = z
  .object({
    status: orderStatusSchema,
    trackingNumber: nonEmptyStringSchema.optional(),
    notes: nonEmptyStringSchema.optional(),
  })
  .strict();
