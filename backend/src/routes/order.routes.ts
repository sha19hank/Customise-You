// backend/src/routes/order.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import OrderService from '../services/orderService';
import { ValidationError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { pool } from '../config/database';

const router = Router();
const orderService = new OrderService(pool);

/**
 * POST /orders - Create new order
 */
router.post(
  '/',
  requireAuth,
  requireRole('user'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, cartItems, shippingAddressId, billingAddressId, shippingMethod, paymentMethod, couponCode } = req.body;

      if (!userId || !cartItems || cartItems.length === 0 || !shippingAddressId || !paymentMethod) {
        throw new ValidationError('User ID, cart items, shipping address, and payment method are required');
      }

      const order = await orderService.createOrder({
        userId,
        cartItems,
        shippingAddressId,
        billingAddressId,
        shippingMethod,
        paymentMethod,
        couponCode,
      });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /orders/:id - Get order details
 */
router.get(
  '/:id',
  requireAuth,
  requireRole('user', 'seller', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('Order ID is required');
      }

      const order = await orderService.getOrderDetails(id);

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /orders/user/:userId - Get user's orders
 */
router.get(
  '/user/:userId',
  requireAuth,
  requireRole('user', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const orders = await orderService.getUserOrders(userId, page, limit);

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /orders/:id/status - Update order status
 */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, trackingNumber, notes } = req.body;

      if (!id) {
        throw new ValidationError('Order ID is required');
      }

      const order = await orderService.updateOrderStatus(id, { status, trackingNumber, notes });

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /orders/:id/cancel - Cancel order
 */
router.post(
  '/:id/cancel',
  requireAuth,
  requireRole('user', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        throw new ValidationError('Order ID is required');
      }

      const order = await orderService.cancelOrder(id, reason);

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
