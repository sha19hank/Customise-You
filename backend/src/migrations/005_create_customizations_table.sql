-- Migration: 005_create_customizations_table
-- Description: Creates the customizations table for product customization options
-- Created: 2026-01-24

CREATE TYPE customization_type AS ENUM ('text', 'color', 'size', 'image', 'material', 'notes', 'custom');

CREATE TABLE IF NOT EXISTS customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Customization Details
    type customization_type NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_customizations_product_id ON customizations(product_id);
CREATE INDEX idx_customizations_type ON customizations(type);
