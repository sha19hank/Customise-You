// backend/src/routes/notification.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';
import { pool } from '../config/database';

const router = Router();

/**
 * GET /notifications - Get user notifications
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const result = await pool.query(
        `SELECT * FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
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
 * POST /notifications/mark-read - Mark notifications as read
 */
router.post(
  '/mark-read',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notificationIds } = req.body;

      if (!notificationIds || notificationIds.length === 0) {
        throw new ValidationError('Notification IDs are required');
      }

      await pool.query(
        `UPDATE notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [notificationIds]
      );

      res.status(200).json({
        success: true,
        message: 'Notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
