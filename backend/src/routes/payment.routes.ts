// backend/src/routes/payment.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import PaymentService from '../services/paymentService';
import { ValidationError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validate';
import { getDatabase } from '../config/database';
import { confirmPaymentBodySchema, createPaymentIntentBodySchema } from '../validators/payment.schema';

const router = Router();

/**
 * POST /payments/create-intent - Create payment intent
 */
router.post(
  '/create-intent',
  requireAuth,
  requireRole('user', 'admin'),
  validateBody(createPaymentIntentBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const paymentService = new PaymentService(db);
      const { orderId, amount, currency, paymentMethod, paymentMethodId } = req.body;

      if (!orderId || !amount || !currency || !paymentMethod) {
        throw new ValidationError('Order ID, amount, currency, and payment method are required');
      }

      const paymentIntent = await paymentService.createPaymentIntent({
        orderId,
        amount,
        currency,
        paymentMethod,
        paymentMethodId,
      });

      res.status(200).json({
        success: true,
        data: paymentIntent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /payments/confirm - Confirm payment
 */
router.post(
  '/confirm',
  requireAuth,
  requireRole('user', 'admin'),
  validateBody(confirmPaymentBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const paymentService = new PaymentService(db);
      const { orderId, transactionId } = req.body;

      if (!orderId || !transactionId) {
        throw new ValidationError('Order ID and transaction ID are required');
      }

      const result = await paymentService.confirmPayment(orderId, transactionId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /payments/status/:orderId - Get payment status
 */
router.get(
  '/status/:orderId',
  requireAuth,
  requireRole('user', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const paymentService = new PaymentService(db);
      const { orderId } = req.params;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const status = await paymentService.getPaymentStatus(orderId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /payments/refund - Process refund
 */
router.post(
  '/refund',
  requireAuth,
  requireRole('user', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const paymentService = new PaymentService(db);
      const { orderId, amount, reason } = req.body;

      if (!orderId || !amount || !reason) {
        throw new ValidationError('Order ID, amount, and reason are required');
      }

      const result = await paymentService.processRefund(orderId, amount, reason);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
