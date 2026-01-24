-- Migration: 003_create_categories_table
-- Description: Creates the categories table for product categorization
-- Created: 2026-01-24

CREATE TABLE IF NOT EXISTS categories (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_category_id ON categories(parent_category_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);
