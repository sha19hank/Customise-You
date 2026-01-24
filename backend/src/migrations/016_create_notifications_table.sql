-- Migration: 016_create_notifications_table
-- Description: Creates the notifications table for user notifications
-- Created: 2026-01-24

CREATE TABLE IF NOT EXISTS notifications (
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
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
