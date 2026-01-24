-- Migration: 014_create_wishlist_items_table
-- Description: Creates the wishlist_items table for user product wishlists
-- Created: 2026-01-24

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Pricing snapshot
    product_name VARCHAR(500),
    price_at_addition DECIMAL(10, 2),
    
    -- Tracking
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (user_id, product_id)
);

-- Indexes
CREATE INDEX idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX idx_wishlist_items_product_id ON wishlist_items(product_id);
