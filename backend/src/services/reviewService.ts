// backend/src/services/reviewService.ts - Review & Rating Service

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface CreateReviewRequest {
  userId: string;
  productId: string;
  orderId?: string;
  rating: number;
  title: string;
  content: string;
  customizationQualityRating?: number;
  images?: string[];
}

class ReviewService {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Create a new review
   */
  async createReview(reviewData: CreateReviewRequest) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const reviewId = uuidv4();

      // Check if user already reviewed this product
      const existingResult = await client.query(
        'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
        [reviewData.userId, reviewData.productId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('You have already reviewed this product');
      }

      // Check if verified purchase
      let verifiedPurchase = false;
      if (reviewData.orderId) {
        const orderResult = await client.query(
          `SELECT id FROM order_items 
           WHERE order_id = $1 AND product_id = $2`,
          [reviewData.orderId, reviewData.productId]
        );
        verifiedPurchase = orderResult.rows.length > 0;
      }

      // Insert review
      const reviewResult = await client.query(
        `INSERT INTO reviews (
          id, user_id, product_id, order_id, rating, title, content,
          customization_quality_rating, verified_purchase, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          reviewId,
          reviewData.userId,
          reviewData.productId,
          reviewData.orderId,
          reviewData.rating,
          reviewData.title,
          reviewData.content,
          reviewData.customizationQualityRating,
          verifiedPurchase,
          'pending', // Needs approval
        ]
      );

      // Update product average rating
      await this.updateProductRating(reviewData.productId, client);

      await client.query('COMMIT');

      return reviewResult.rows[0];
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create review: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get product reviews
   */
  async getProductReviews(productId: string, page: number = 1, limit: number = 10) {
    try {
      const offset = (page - 1) * limit;

      // Get reviews
      const reviewsResult = await this.db.query(
        `SELECT r.*, 
                u.first_name, u.last_name, u.profile_image_url
         FROM reviews r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.product_id = $1 AND r.status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [productId, limit, offset]
      );

      // Get rating distribution
      const distributionResult = await this.db.query(
        `SELECT rating, COUNT(*) as count
         FROM reviews
         WHERE product_id = $1 AND status = 'approved'
         GROUP BY rating
         ORDER BY rating DESC`,
        [productId]
      );

      // Get total count and average
      const statsResult = await this.db.query(
        `SELECT COUNT(*) as total, AVG(rating) as average
         FROM reviews
         WHERE product_id = $1 AND status = 'approved'`,
        [productId]
      );

      const ratingDistribution: { [key: number]: number } = {};
      distributionResult.rows.forEach((row: any) => {
        ratingDistribution[row.rating] = parseInt(row.count);
      });

      return {
        data: reviewsResult.rows,
        total: parseInt(statsResult.rows[0].total),
        averageRating: parseFloat(statsResult.rows[0].average) || 0,
        ratingDistribution,
        page,
        limit,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch reviews: ${errorMessage}`);
    }
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId: string, userId: string) {
    try {
      // Check if already marked
      const existingResult = await this.db.query(
        'SELECT id FROM review_helpfulness WHERE review_id = $1 AND user_id = $2',
        [reviewId, userId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('You have already marked this review');
      }

      // Add helpful mark
      await this.db.query(
        'INSERT INTO review_helpfulness (review_id, user_id, is_helpful) VALUES ($1, $2, $3)',
        [reviewId, userId, true]
      );

      // Update count
      await this.db.query(
        'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1',
        [reviewId]
      );

      return { success: true, message: 'Review marked as helpful' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to mark review as helpful: ${errorMessage}`);
    }
  }

  /**
   * Update product average rating
   */
  private async updateProductRating(productId: string, client: any) {
    const result = await client.query(
      `SELECT AVG(rating) as average, COUNT(*) as total
       FROM reviews
       WHERE product_id = $1 AND status = 'approved'`,
      [productId]
    );

    await client.query(
      'UPDATE products SET average_rating = $1, total_reviews = $2 WHERE id = $3',
      [result.rows[0].average || 0, result.rows[0].total, productId]
    );
  }
}

export default ReviewService;
