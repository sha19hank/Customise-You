// backend/src/routes/review.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import ReviewService from '../services/reviewService';
import { ValidationError } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { pool } from '../config/database';

const router = Router();
const reviewService = new ReviewService(pool);

/**
 * POST /reviews - Create new review
 */
router.post(
  '/',
  requireAuth,
  requireRole('user', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, productId, orderId, rating, title, content, customizationQualityRating, images } = req.body;

      if (!userId || !productId || !rating || !title || !content) {
        throw new ValidationError('User ID, product ID, rating, title, and content are required');
      }

      if (rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      const review = await reviewService.createReview({
        userId,
        productId,
        orderId,
        rating,
        title,
        content,
        customizationQualityRating,
        images,
      });

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully (pending approval)',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /reviews/product/:productId - Get product reviews
 */
router.get(
  '/product/:productId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const reviews = await reviewService.getProductReviews(productId, page, limit);

      res.status(200).json({
        success: true,
        data: reviews.data,
        meta: {
          total: reviews.total,
          averageRating: reviews.averageRating,
          ratingDistribution: reviews.ratingDistribution,
          page: reviews.page,
          limit: reviews.limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /reviews/:id/helpful - Mark review as helpful
 */
router.post(
  '/:id/helpful',
  requireAuth,
  requireRole('user', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!id || !userId) {
        throw new ValidationError('Review ID and User ID are required');
      }

      const result = await reviewService.markReviewHelpful(id, userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
