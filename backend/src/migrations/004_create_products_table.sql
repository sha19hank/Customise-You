-- Migration: 004_create_products_table
-- Description: Creates the products table for product listings
-- Created: 2026-01-24

CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived', 'deleted');

CREATE TABLE IF NOT EXISTS products (
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
    status product_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    featured_until TIMESTAMP,
    
    -- Tracking
    views_count INT DEFAULT 0,
    wishlist_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_is_customizable ON products(is_customizable);
CREATE INDEX idx_products_base_price ON products(base_price);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_slug ON products(slug);
