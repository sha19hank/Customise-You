// backend/src/routes/seller.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { getDatabase } from '../config/database';

const router = Router();

/**
 * POST /seller/onboard - Convert buyer to seller (no auth middleware on this route)
 */
router.post(
  '/onboard',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      const db = await getDatabase();

      // Check if user already has a seller account
      const existingSeller = await db.query(
        'SELECT id FROM sellers WHERE user_id = $1',
        [userId]
      );

      if (existingSeller.rows.length > 0) {
        // Seller already exists - just update user role if needed
        const userCheck = await db.query(
          'SELECT role FROM users WHERE id = $1',
          [userId]
        );

        if (userCheck.rows[0]?.role !== 'seller') {
          await db.query(
            'UPDATE users SET role = $1 WHERE id = $2',
            ['seller', userId]
          );
        }

        // Get updated user data
        const userData = await db.query(
          'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = $1',
          [userId]
        );

        return res.status(200).json({
          success: true,
          message: 'Seller account already exists',
          data: {
            user: userData.rows[0],
            sellerId: existingSeller.rows[0].id,
          },
        });
      }

      // Create new seller record
      const sellerResult = await db.query(
        `INSERT INTO sellers (
          user_id, 
          business_name, 
          country, 
          level, 
          experience_points
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [
          userId,
          'My Shop', // Default business name
          'India',
          1,
          0,
        ]
      );

      const sellerId = sellerResult.rows[0].id;

      // Update user role to seller
      await db.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['seller', userId]
      );

      // Get updated user data
      const userData = await db.query(
        'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = $1',
        [userId]
      );

      res.status(201).json({
        success: true,
        message: 'Successfully onboarded as seller',
        data: {
          user: userData.rows[0],
          sellerId: sellerId,
          kycRequired: true, // KYC must be completed before selling
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /seller/kyc - Submit KYC details
 */
router.post(
  '/kyc',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const { legalFullName, panNumber, bankAccountNumber, bankIfscCode } = req.body;

      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      if (!legalFullName || !panNumber || !bankAccountNumber || !bankIfscCode) {
        throw new ValidationError('All KYC fields are required');
      }

      const db = await getDatabase();

      // Check if KYC already exists
      const existingKyc = await db.query(
        'SELECT id, status FROM seller_kyc WHERE user_id = $1',
        [userId]
      );

      if (existingKyc.rows.length > 0) {
        throw new ValidationError('KYC already submitted. Please contact support to update.');
      }

      // Insert KYC record
      const kycResult = await db.query(
        `INSERT INTO seller_kyc (
          user_id,
          legal_full_name,
          pan_number,
          bank_account_number,
          bank_ifsc_code,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, status, submitted_at`,
        [userId, legalFullName, panNumber, bankAccountNumber, bankIfscCode, 'pending']
      );

      res.status(201).json({
        success: true,
        message: 'KYC submitted successfully. Verification in progress.',
        data: kycResult.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /seller/kyc - Get KYC status
 */
router.get(
  '/kyc',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      const db = await getDatabase();
      const kycData = await db.query(
        'SELECT id, status, submitted_at, approved_at, rejected_at, rejection_reason FROM seller_kyc WHERE user_id = $1',
        [userId]
      );

      if (kycData.rows.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            status: 'not_submitted',
            kycRequired: true,
          },
        });
      }

      res.status(200).json({
        success: true,
        data: kycData.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

router.use(requireRole('seller', 'admin'));

// Middleware to check KYC status for product/order operations
const requireKYCApproved = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
    }

    const db = await getDatabase();
    const kycData = await db.query(
      'SELECT status FROM seller_kyc WHERE user_id = $1',
      [userId]
    );

    if (kycData.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: { 
          message: 'KYC verification required',
          code: 'KYC_NOT_SUBMITTED',
        },
      });
    }

    if (kycData.rows[0].status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: { 
          message: `KYC verification ${kycData.rows[0].status}. Please complete KYC to access seller features.`,
          code: 'KYC_NOT_APPROVED',
          status: kycData.rows[0].status,
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

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
      
      // Check KYC status
      const kycData = await db.query(
        'SELECT status FROM seller_kyc WHERE user_id = $1',
        [sellerId]
      );

      const kycStatus = kycData.rows.length > 0 ? kycData.rows[0].status : 'not_submitted';

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
          kycStatus: kycStatus,
          kycRequired: kycStatus !== 'approved',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
