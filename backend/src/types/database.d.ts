// backend/src/types/database.d.ts
// Database model type definitions with legal compliance and delivery pricing fields

/**
 * User model with optional terms acceptance tracking
 * New field: accepted_user_terms_at (nullable timestamp)
 */
export interface User {
  id: string;
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  password_hash?: string;
  profile_image_url?: string | null;
  bio?: string | null;
  date_of_birth?: Date | null;
  gender?: string | null;

  // Authentication
  email_verified: boolean;
  phone_verified: boolean;
  email_verified_at?: Date | null;
  phone_verified_at?: Date | null;
  last_login_at?: Date | null;

  // Account Status
  status: 'active' | 'suspended' | 'deleted';
  registration_source?: string | null;

  // Preferences
  preferred_language: string;
  notifications_enabled: boolean;
  marketing_emails: boolean;

  // Legal Compliance (NEW - ADDITIVE)
  accepted_user_terms_at?: Date | null; // Timestamp when user accepted platform terms

  // Metadata
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

/**
 * Seller model with enhanced onboarding and legal compliance fields
 * New fields: id_type, gstin, seller_country, accepts_cod, bank_account_verified, accepted_seller_terms_at
 */
export interface Seller {
  id: string;
  user_id: string;

  // Business Info
  business_name: string;
  business_email?: string | null;
  business_phone?: string | null;
  business_website?: string | null;
  business_description?: string | null;
  business_logo_url?: string | null;
  business_banner_url?: string | null;

  // KYC Information
  kyc_status: 'pending' | 'verified' | 'rejected' | 'expired';
  kyc_verified_at?: Date | null;
  aadhar_number?: string | null;
  pan_number?: string | null;
  gst_number?: string | null; // Existing field
  business_registration_number?: string | null;

  // Enhanced KYC/Legal Fields (NEW - ADDITIVE)
  id_type?: string | null; // e.g., 'aadhar', 'pan', 'passport' - optional
  gstin?: string | null; // GST Identification Number - only if GST-registered
  seller_country: string; // ISO 3166-1 alpha-2, defaults to 'IN' for India

  // Bank Details
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  bank_account_holder_name?: string | null;
  bank_account_verified: boolean; // NEW - for future payout readiness

  // Location
  country?: string | null; // Legacy field, use seller_country instead
  state?: string | null;
  city?: string | null;
  postal_code?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Payment Options (NEW - FUTURE-READY)
  accepts_cod: boolean; // COD acceptance flag - COD NOT ACTIVE YET, backend rejects attempts

  // Rating & Performance
  average_rating: number;
  total_reviews: number;
  total_orders: number;
  fulfillment_rate: number;
  response_time_hours: number;

  // Commission & Fees
  commission_percentage: number;
  processing_fee_percentage: number;

  // Account Status
  status: 'active' | 'suspended' | 'inactive' | 'deleted' | 'pending';
  suspension_reason?: string | null;
  suspension_date?: Date | null;

  // Onboarding & Legal Compliance (NEW - ADDITIVE)
  onboarding_completed_at?: Date | null;
  accepted_seller_terms_at?: Date | null; // Timestamp when seller accepted platform terms

  // Badges (for seller gamification)
  badges?: string[]; // JSON array of badge names

  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Product model with delivery pricing transparency
 * New fields: delivery_price, delivery_price_type
 */
export interface Product {
  id: string;
  seller_id: string;
  category_id: string;

  // Basic Info
  name: string;
  slug: string;
  description?: string | null;
  detailed_description?: string | null;

  // Pricing
  base_price: number;
  discount_percentage: number;
  final_price: number;
  currency: string;

  // Delivery Pricing (NEW - ADDITIVE)
  delivery_price: number; // Delivery/shipping cost (0 = free delivery)
  delivery_price_type: 'flat' | 'included' | 'calculated'; // Pricing strategy

  // Inventory
  quantity_available: number;
  quantity_sold: number;
  low_stock_threshold: number;

  // Customization
  is_customizable: boolean;
  customization_types?: any; // JSON array

  // Media
  main_image_url?: string | null;
  thumbnail_url?: string | null;
  images?: any; // JSON array
  video_url?: string | null;

  // Attributes
  attributes?: any; // JSON object
  weight_kg?: number | null;
  dimensions_cm?: any; // JSON object

  // Rating & Reviews
  average_rating: number;
  total_reviews: number;

  // SEO
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;

  // Status
  status: 'draft' | 'active' | 'archived' | 'deleted';
  is_featured: boolean;
  featured_until?: Date | null;

  // Tracking
  views_count: number;
  wishlist_count: number;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

/**
 * Order model (for reference)
 */
export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  seller_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: 'stripe' | 'razorpay' | 'paypal' | 'cod'; // COD listed but rejected
  total_amount: number;
  platform_fee?: number | null;
  created_at: Date;
  updated_at: Date;
}
