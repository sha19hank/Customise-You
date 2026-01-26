// Customization service
import apiClient from './api';
import { CustomizationOption } from '@/types/customization';

export const customizationService = {
  /**
   * Get customization options for a product
   */
  async getProductCustomizations(productId: string): Promise<CustomizationOption[]> {
    const response = await apiClient.get(`/customizations/product/${productId}`);
    return response.data.data;
  },
};
