// Customization type definitions

export interface CustomizationOption {
  id: string;
  product_id: string;
  type: 'text' | 'color' | 'size' | 'material' | 'image' | 'dropdown' | 'checkbox';
  label: string;
  description?: string;
  is_required: boolean;
  input_type: 'text' | 'textarea' | 'color_picker' | 'dropdown' | 'radio' | 'checkbox' | 'file_upload' | 'number';
  price_adjustment: number;
  options?: string[]; // For dropdown, radio, checkbox options
  min_value?: number;
  max_value?: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomizationValue {
  customizationId: string;
  value: string | number | boolean | File;
  label: string;
  priceAdjustment: number;
}

export interface CustomizationSelection {
  [customizationId: string]: CustomizationValue;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  order_id?: string;
  rating: number;
  title: string;
  content: string;
  customization_quality_rating?: number;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  
  // Joined data
  user_name?: string;
  helpful_count?: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewListResponse {
  data: Review[];
  meta: {
    total: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
    page: number;
    limit: number;
    totalPages: number;
  };
}
