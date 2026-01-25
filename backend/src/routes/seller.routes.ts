// backend/src/routes/seller.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { getDatabase } from '../config/database';

const router = Router();

router.use(requireAuth, requireRole('seller', 'admin'));

/**
 * GET /seller/products - Get seller's products
 */
router.get(
  '/products',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.query.sellerId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      if (!sellerId) {
        throw new ValidationError('Seller ID is required');
      }

      const db = await getDatabase();
      const result = await db.query(
        `SELECT id, name, slug, base_price, final_price, quantity_available,
                status, is_customizable, average_rating, total_reviews,
                views_count, quantity_sold, created_at
         FROM products
         WHERE seller_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [sellerId, limit, offset]
      );

      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /seller/orders - Get seller's orders
 */
router.get(
  '/orders',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.query.sellerId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      if (!sellerId) {
        throw new ValidationError('Seller ID is required');
      }

      const db = await getDatabase();
      const result = await db.query(
        `SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at,
                u.first_name, u.last_name, u.email
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.seller_id = $1
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3`,
        [sellerId, limit, offset]
      );

      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /seller/dashboard - Get seller dashboard stats
 */
router.get(
  '/dashboard',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sellerId = req.query.sellerId as string;

      if (!sellerId) {
        throw new ValidationError('Seller ID is required');
      }

      const db = await getDatabase();
      const [productsCount, ordersCount, revenue, ratings] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM products WHERE seller_id = $1', [sellerId]),
        db.query('SELECT COUNT(*) as count FROM orders WHERE seller_id = $1', [sellerId]),
        db.query('SELECT SUM(total_amount) as total FROM orders WHERE seller_id = $1 AND payment_status = $2', [sellerId, 'completed']),
        db.query('SELECT average_rating FROM users WHERE id = $1', [sellerId]),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalProducts: parseInt(productsCount.rows[0].count),
          totalOrders: parseInt(ordersCount.rows[0].count),
          totalRevenue: parseFloat(revenue.rows[0].total) || 0,
          averageRating: parseFloat(ratings.rows[0]?.average_rating) || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
