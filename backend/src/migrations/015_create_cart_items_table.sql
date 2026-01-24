-- Migration: 015_create_cart_items_table
-- Description: Creates the cart_items table for shopping cart functionality
-- Created: 2026-01-24

CREATE TABLE IF NOT EXISTS cart_items (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
