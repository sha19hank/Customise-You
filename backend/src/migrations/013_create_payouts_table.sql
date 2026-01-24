-- Migration: 013_create_payouts_table
-- Description: Creates the payouts table for seller payment tracking
-- Created: 2026-01-24

CREATE TYPE payout_status AS ENUM ('pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS payouts (
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
    status payout_status DEFAULT 'pending',
    scheduled_date DATE,
    processed_at TIMESTAMP,
    
    -- Payment Method
    payment_method VARCHAR(50), -- 'bank_transfer', 'check', 'wallet'
    bank_account_id UUID,
    
    -- Metadata
    metadata JSON,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payouts_seller_id ON payouts(seller_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_processed_at ON payouts(processed_at);
