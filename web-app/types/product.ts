// Product type definitions

export interface Seller {
  id: string;
  business_name: string;
  average_rating?: number;
  total_orders?: number;
  badge?: string;
  experience_level?: 'beginner' | 'intermediate' | 'expert' | 'master';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number | string;
  seller_id: string;
  category_id: string;
  is_customizable: boolean;
  image_url?: string;
  images?: string[];
  stock_quantity?: number;
  quantity_available?: number; // Backend uses this field
  status: 'active' | 'inactive' | 'out_of_stock';
  created_at: string;
  updated_at: string;
  delivery_price?: number | string;
  delivery_price_type?: 'flat' | 'included' | 'calculated';
  
  // Joined data
  category_name?: string;
  seller_name?: string;
  seller?: Seller;
  average_rating?: number | string;
  review_count?: number;
  total_reviews?: number;
  
  // Additional fields from backend
  main_image_url?: string;
  customizations?: any[];
  reviews?: any[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  product_count?: number;
}

export interface ProductFilters {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'rating';
  customizableOnly?: boolean;
}

export interface ProductListResponse {
  data: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CategoryListResponse {
  data: Category[];
}
