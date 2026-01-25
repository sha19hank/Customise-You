// backend/src/routes/customization.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { getDatabase } from '../config/database';

const router = Router();

/**
 * GET /customizations/product/:productId - Get product customizations
 */
router.get(
  '/product/:productId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;

      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const db = await getDatabase();
      const result = await db.query(
        `SELECT * FROM customizations
         WHERE product_id = $1 AND is_active = true
         ORDER BY display_order ASC`,
        [productId]
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
 * POST /customizations - Create customization option
 */
router.post(
  '/',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId, type, label, description, isRequired, inputType, priceAdjustment } = req.body;

      if (!productId || !type || !label) {
        throw new ValidationError('Product ID, type, and label are required');
      }

      const db = await getDatabase();
      const result = await db.query(
        `INSERT INTO customizations (
          product_id, type, label, description, is_required,
          input_type, price_adjustment, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [productId, type, label, description, isRequired, inputType, priceAdjustment || 0, true]
      );

      res.status(201).json({
        success: true,
        message: 'Customization option created',
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
