// Product service
import apiClient from './api';
import { Product, Category, ProductFilters, ProductListResponse, CategoryListResponse } from '@/types/product';

export const productService = {
  /**
   * Get products with optional filters and pagination
   */
  async getProducts(filters?: ProductFilters, page: number = 1, limit: number = 20): Promise<ProductListResponse> {
    const params: any = {
      page,
      limit,
    };

    if (filters?.categoryId) params.category_id = filters.categoryId;
    if (filters?.search) params.search = filters.search;
    if (filters?.minPrice) params.min_price = filters.minPrice;
    if (filters?.maxPrice) params.max_price = filters.maxPrice;
    if (filters?.sortBy) params.sort_by = filters.sortBy;
    if (filters?.customizableOnly) params.customizable_only = true;

    const response = await apiClient.get('/products', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data.data;
  },

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get('/products/categories');
    return response.data.data;
  },

  /**
   * Search products
   */
  async searchProducts(query: string, page: number = 1, limit: number = 20): Promise<ProductListResponse> {
    const response = await apiClient.get('/products/search', {
      params: { q: query, page, limit },
    });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },
};
