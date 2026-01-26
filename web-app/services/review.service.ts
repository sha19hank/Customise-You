// Review service
import apiClient from './api';
import { ReviewListResponse } from '@/types/customization';

export const reviewService = {
  /**
   * Get reviews for a product
   */
  async getProductReviews(productId: string, page: number = 1, limit: number = 10): Promise<ReviewListResponse> {
    const response = await apiClient.get(`/reviews/product/${productId}`, {
      params: { page, limit },
    });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },
};
