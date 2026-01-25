// backend/src/routes/admin.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { getDatabase } from '../config/database';

const router = Router();

router.use(requireAuth, requireRole('admin'));

/**
 * GET /admin/sellers - Get all sellers
 */
router.get(
  '/sellers',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const db = await getDatabase();
      const result = await db.query(
        `SELECT id, email, business_name, kyc_status, status, created_at
         FROM users
         WHERE role = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        ['seller', limit, offset]
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
 * PUT /admin/sellers/:id/verify - Verify seller KYC
 */
router.put(
  '/sellers/:id/verify',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!id || !status) {
        throw new ValidationError('Seller ID and status are required');
      }

      const db = await getDatabase();
      const result = await db.query(
        `UPDATE users 
         SET kyc_status = $1, kyc_notes = $2, kyc_verified_at = NOW()
         WHERE id = $3 AND role = 'seller'
         RETURNING *`,
        [status, notes, id]
      );

      res.status(200).json({
        success: true,
        message: 'Seller KYC status updated',
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /admin/stats - Get platform statistics
 */
router.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDatabase();
      const [users, sellers, products, orders, revenue] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['user']),
        db.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['seller']),
        db.query('SELECT COUNT(*) as count FROM products WHERE status = $1', ['active']),
        db.query('SELECT COUNT(*) as count FROM orders'),
        db.query('SELECT SUM(total_amount) as total FROM orders WHERE payment_status = $1', ['completed']),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalUsers: parseInt(users.rows[0].count),
          totalSellers: parseInt(sellers.rows[0].count),
          totalProducts: parseInt(products.rows[0].count),
          totalOrders: parseInt(orders.rows[0].count),
          totalRevenue: parseFloat(revenue.rows[0].total) || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
