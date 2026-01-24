-- Migration: 009_create_order_customizations_table
-- Description: Creates the order_customizations table for storing customer customization choices
-- Created: 2026-01-24

CREATE TABLE IF NOT EXISTS order_customizations (
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
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_order_customizations_order_item_id ON order_customizations(order_item_id);
CREATE INDEX idx_order_customizations_customization_id ON order_customizations(customization_id);
