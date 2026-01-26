# CustomiseYou Database Schema

## 📋 Overview

PostgreSQL relational database design for CustomiseYou platform. Supports 1M+ users, 100K+ sellers, and millions of product listings.

---

## 🔑 Core Tables

### 1. Users (Customers)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255),
    profile_image_url VARCHAR(500),
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    
    -- Authentication
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- Account Status
    status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
    registration_source VARCHAR(50), -- 'mobile_app', 'web_app', 'google', 'apple'
    
    -- Preferences
    preferred_language VARCHAR(20) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
    
    INDEX idx_email,
    INDEX idx_phone,
    INDEX idx_status,
    INDEX idx_created_at
);
```

---

### 2. Sellers

```sql
CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Business Info
    business_name VARCHAR(255) NOT NULL,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    business_website VARCHAR(500),
    business_description TEXT,
    business_logo_url VARCHAR(500),
    business_banner_url VARCHAR(500),
    
    -- KYC Information
    kyc_status ENUM('pending', 'verified', 'rejected', 'expired') DEFAULT 'pending',
    kyc_verified_at TIMESTAMP,
    aadhar_number VARCHAR(12),
    pan_number VARCHAR(10),
    gst_number VARCHAR(15),
    business_registration_number VARCHAR(50),
    
    -- Bank Details
    bank_account_number VARCHAR(20),
    bank_ifsc_code VARCHAR(11),
    bank_account_holder_name VARCHAR(255),
    
    -- Location
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Rating & Performance
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    fulfillment_rate DECIMAL(5, 2) DEFAULT 100,
    response_time_hours INT DEFAULT 24,
    
    -- Commission & Fees
    commission_percentage DECIMAL(5, 2) DEFAULT 10,
    processing_fee_percentage DECIMAL(5, 2) DEFAULT 2,
    
    -- Account Status
    status ENUM('active', 'suspended', 'inactive', 'deleted') DEFAULT 'pending',
    suspension_reason TEXT,
    suspension_date TIMESTAMP,
    
    -- Onboarding
    onboarding_completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id,
    INDEX idx_status,
    INDEX idx_kyc_status,
    INDEX idx_average_rating
);
```

---

### 3. Categories

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(500),
    icon_url VARCHAR(500),
    
    -- Hierarchy
    parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    level INT DEFAULT 1,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    meta_keywords VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_slug,
    INDEX idx_parent_category_id,
    INDEX idx_is_active
);
```

---

### 4. Products

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    
    -- Basic Info
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    description TEXT,
    detailed_description TEXT,
    
    -- Pricing
    base_price DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    final_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Inventory
    quantity_available INT DEFAULT 0,
    quantity_sold INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    
    -- Customization
    is_customizable BOOLEAN DEFAULT TRUE,
    customization_types JSON, -- JSON array of customization types
    
    -- Media
    main_image_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    images JSON, -- Array of image URLs
    video_url VARCHAR(500),
    
    -- Attributes
    attributes JSON, -- Size, color, material, etc.
    weight_kg DECIMAL(10, 3),
    dimensions_cm JSON, -- {length, width, height}
    
    -- Rating & Reviews
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    meta_keywords VARCHAR(500),
    
    -- Status
    status ENUM('draft', 'active', 'archived', 'deleted') DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    featured_until TIMESTAMP,
    
    -- Tracking
    views_count INT DEFAULT 0,
    wishlist_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (seller_id) REFERENCES sellers(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_seller_id,
    INDEX idx_category_id,
    INDEX idx_status,
    INDEX idx_is_customizable,
    INDEX idx_base_price,
    INDEX idx_created_at
);
```

---

### 5. Customizations

```sql
CREATE TABLE customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Customization Details
    type ENUM('text', 'color', 'size', 'image', 'material', 'notes', 'custom') NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Validation & Options
    is_required BOOLEAN DEFAULT FALSE,
    input_type VARCHAR(50), -- 'text', 'textarea', 'select', 'checkbox', 'file_upload'
    allowed_values JSON, -- For select type
    min_length INT,
    max_length INT,
    regex_pattern VARCHAR(255),
    
    -- Pricing
    price_adjustment DECIMAL(10, 2) DEFAULT 0, -- Extra charge for this customization
    price_calculation_type VARCHAR(50), -- 'fixed', 'per_unit', 'percentage'
    
    -- File Upload Settings
    max_file_size_mb INT DEFAULT 10,
    allowed_file_types JSON, -- ['jpg', 'png', 'pdf']
    
    -- Preview
    preview_template VARCHAR(500),
    
    -- Display
    display_order INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_product_id,
    INDEX idx_type
);
```

---

### 6. Orders

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id),
    
    -- Order Details
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Shipping
    shipping_address_id UUID REFERENCES addresses(id),
    shipping_method VARCHAR(50), -- 'standard', 'express', 'overnight'
    tracking_number VARCHAR(100),
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Billing
    billing_address_id UUID REFERENCES addresses(id),
    
    -- Payment
    payment_method VARCHAR(50), -- 'credit_card', 'debit_card', 'paypal', 'razorpay'
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_id VARCHAR(100),
    paid_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES sellers(id),
    INDEX idx_user_id,
    INDEX idx_seller_id,
    INDEX idx_status,
    INDEX idx_order_number,
    INDEX idx_created_at
);
```

---

### 7. Order Items

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Item Details
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    
    -- Customization Reference
    customization_id UUID REFERENCES order_customizations(id),
    
    -- Status
    item_status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_order_id,
    INDEX idx_product_id
);
```

---

### 8. Order Customizations

```sql
CREATE TABLE order_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    customization_id UUID NOT NULL REFERENCES customizations(id),
    
    -- User's Customization Choices
    customization_value TEXT NOT NULL,
    -- For image uploads, store the file URL
    file_url VARCHAR(500),
    
    -- Price Impact
    price_adjustment DECIMAL(10, 2) DEFAULT 0,
    
    -- Preview
    preview_image_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_item_id) REFERENCES order_items(id),
    FOREIGN KEY (customization_id) REFERENCES customizations(id),
    INDEX idx_order_item_id
);
```

---

### 9. Reviews & Ratings

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Review Content
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    
    -- Seller Customization Feedback
    customization_quality_rating INT CHECK (customization_quality_rating >= 1 AND customization_quality_rating <= 5),
    
    -- Media
    images JSON, -- URLs of review images
    
    -- Moderation
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    moderation_reason TEXT,
    
    -- Engagement
    helpful_count INT DEFAULT 0,
    unhelpful_count INT DEFAULT 0,
    
    -- Verification
    verified_purchase BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_product_id,
    INDEX idx_user_id,
    INDEX idx_rating,
    INDEX idx_status
);
```

---

### 10. Messages (Chat)

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    
    -- Context
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Content
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'file', 'attachment'
    content TEXT,
    file_url VARCHAR(500),
    media_type VARCHAR(50), -- 'image', 'document', 'video'
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_recipient BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id),
    INDEX idx_sender_id,
    INDEX idx_recipient_id,
    INDEX idx_created_at,
    INDEX idx_is_read
);
```

---

### 11. Addresses

```sql
CREATE TYPE address_type AS ENUM ('Home', 'Work', 'Other');

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Address Details
    type address_type DEFAULT 'Home', -- UPDATED: Migration 022 changed from (shipping|billing|both)
    label VARCHAR(100), -- Optional custom label
    
    -- Address Components
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address_line_1 VARCHAR(500) NOT NULL,
    address_line_2 VARCHAR(500),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Flags
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id,
    INDEX idx_is_default
);

-- Note: address_type enum values are case-sensitive
-- Frontend must send exactly: 'Home', 'Work', or 'Other'
```

---

### 12. Transactions

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    -- Parties Involved
    payer_id UUID NOT NULL REFERENCES users(id),
    payee_id UUID REFERENCES sellers(id),
    
    -- Amount
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment Details
    payment_method VARCHAR(50), -- 'stripe', 'razorpay', 'paypal'
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_gateway_reference VARCHAR(100),
    
    -- Fee Details
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    processing_fee DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL,
    
    -- Refund
    refund_status ENUM('none', 'partial', 'full') DEFAULT 'none',
    refund_amount DECIMAL(10, 2) DEFAULT 0,
    refund_reason TEXT,
    refund_processed_at TIMESTAMP,
    
    -- Metadata
    metadata JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    FOREIGN KEY (payer_id) REFERENCES users(id),
    FOREIGN KEY (payee_id) REFERENCES sellers(id),
    INDEX idx_payer_id,
    INDEX idx_payee_id,
    INDEX idx_payment_status,
    INDEX idx_created_at
);
```

---

### 13. Payouts

```sql
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    
    -- Payout Details
    payout_period_start DATE NOT NULL,
    payout_period_end DATE NOT NULL,
    
    -- Amount Calculation
    gross_earnings DECIMAL(10, 2) NOT NULL,
    platform_commission DECIMAL(10, 2) NOT NULL,
    processing_fees DECIMAL(10, 2) DEFAULT 0,
    refunds DECIMAL(10, 2) DEFAULT 0,
    net_payout_amount DECIMAL(10, 2) NOT NULL,
    
    -- Status
    status ENUM('pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    scheduled_date DATE,
    processed_at TIMESTAMP,
    
    -- Payment Method
    payment_method VARCHAR(50), -- 'bank_transfer', 'check', 'wallet'
    bank_account_id UUID,
    
    -- Metadata
    metadata JSON,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (seller_id) REFERENCES sellers(id),
    INDEX idx_seller_id,
    INDEX idx_status,
    INDEX idx_processed_at
);
```

---

### 14. Wishlist

```sql
CREATE TABLE wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Pricing snapshot
    product_name VARCHAR(500),
    price_at_addition DECIMAL(10, 2),
    
    -- Tracking
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_user_id,
    INDEX idx_product_id
);
```

---

### 15. Cart

```sql
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Item Details
    quantity INT NOT NULL DEFAULT 1,
    added_price DECIMAL(10, 2), -- Price snapshot
    
    -- Customization
    selected_customizations JSON, -- Array of selected customization IDs and values
    
    -- Timestamps
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_user_id,
    INDEX idx_product_id
);
```

---

### 16. Notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification Details
    type VARCHAR(50) NOT NULL, -- 'order_update', 'product_message', 'promotion', 'system'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Context
    related_entity_type VARCHAR(50), -- 'order', 'product', 'seller', 'review'
    related_entity_id VARCHAR(100),
    
    -- Media
    image_url VARCHAR(500),
    action_url VARCHAR(500),
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Delivery
    delivery_channels JSON, -- ['push', 'email', 'sms', 'in_app']
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id,
    INDEX idx_type,
    INDEX idx_is_read
);
```

---

## 🏗️ Indexes & Performance

### Key Indexes
- User lookups: `idx_email`, `idx_phone`
- Product searches: `idx_status`, `idx_category_id`, `idx_base_price`
- Order tracking: `idx_user_id`, `idx_seller_id`, `idx_status`, `idx_order_number`
- Message queries: `idx_sender_id`, `idx_recipient_id`, `idx_is_read`

### Partitioning Strategy
- `orders` partitioned by `created_at` (monthly)
- `transactions` partitioned by `created_at` (monthly)
- `messages` partitioned by `created_at` (monthly)

---

## 🔄 Relationships

```
Users (1) ─── (M) Orders
         └─── (M) Reviews
         └─── (M) Wishlist Items
         └─── (M) Cart Items
         └─── (M) Messages (sender & recipient)
         └─── (M) Addresses
         └─── (1) Sellers (seller relationship)

Sellers (1) ─── (M) Products
         └─── (M) Orders
         └─── (M) Payouts
         └─── (M) Messages (seller response)

Products (1) ─── (M) Customizations
          ├─── (M) Order Items
          ├─── (M) Reviews
          └─── (M) Wishlist Items

Orders (1) ─── (M) Order Items
       ├─── (M) Order Customizations
       ├─── (1) Transactions
       └─── (M) Messages

Categories (1) ─── (M) Products
```

---

## 🔒 Data Retention

- Deleted users: Soft delete (retained 90 days)
- Deleted products: Soft delete (retained 30 days)
- Chat messages: Retained 1 year
- Transactions: Retained 7 years (regulatory)
- Notifications: Retained 6 months

---

**Version**: 1.0.0  
**Database**: PostgreSQL 13+  
**Last Updated**: January 2026
