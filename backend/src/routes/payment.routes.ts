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

/**
 * POST /payments/razorpay/create - Create Razorpay order
 */
router.post(
  '/razorpay/create',
  requireAuth,
  requireRole('user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const paymentService = new PaymentService(db);
      const { orderId } = req.body;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const razorpayOrder = await paymentService.createRazorpayOrder(orderId);

      res.status(200).json({
        success: true,
        message: 'Razorpay order created successfully',
        data: razorpayOrder,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /payments/razorpay/verify - Verify Razorpay payment
 */
router.post(
  '/razorpay/verify',
  requireAuth,
  requireRole('user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const paymentService = new PaymentService(db);
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
        throw new ValidationError('Payment ID, Order ID, Signature, and Order ID are required');
      }

      const result = await paymentService.verifyRazorpayPayment({
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        orderId,
      });

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /payments/razorpay/webhook - Razorpay webhook handler
 */
router.post(
  '/razorpay/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const paymentService = new PaymentService(db);
      const webhookSignature = req.headers['x-razorpay-signature'] as string;
      const webhookBody = req.body;

      if (!webhookSignature) {
        throw new ValidationError('Webhook signature is required');
      }

      await paymentService.handleRazorpayWebhook(webhookBody, webhookSignature);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
