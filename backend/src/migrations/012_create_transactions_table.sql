-- Migration: 012_create_transactions_table
-- Description: Creates the transactions table for payment tracking
-- Created: 2026-01-24

CREATE TYPE transaction_payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE refund_status AS ENUM ('none', 'partial', 'full');

CREATE TABLE IF NOT EXISTS transactions (
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
    payment_status transaction_payment_status DEFAULT 'pending',
    payment_gateway_reference VARCHAR(100),
    
    -- Fee Details
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    processing_fee DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL,
    
    -- Refund
    refund_status refund_status DEFAULT 'none',
    refund_amount DECIMAL(10, 2) DEFAULT 0,
    refund_reason TEXT,
    refund_processed_at TIMESTAMP,
    
    -- Metadata
    metadata JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_payer_id ON transactions(payer_id);
CREATE INDEX idx_transactions_payee_id ON transactions(payee_id);
CREATE INDEX idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
