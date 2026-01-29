-- Migration: 021_create_seller_kyc_table
-- Description: Creates seller KYC verification table for marketplace compliance
-- Created: 2026-01-28

CREATE TYPE kyc_verification_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS seller_kyc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- KYC Details
    legal_full_name VARCHAR(255) NOT NULL,
    pan_number VARCHAR(10) NOT NULL,
    bank_account_number VARCHAR(20) NOT NULL,
    bank_ifsc_code VARCHAR(11) NOT NULL,
    
    -- Status
    status kyc_verification_status DEFAULT 'pending',
    
    -- Metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_pan CHECK (pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    CONSTRAINT valid_ifsc CHECK (bank_ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
);

-- Indexes
CREATE INDEX idx_seller_kyc_user_id ON seller_kyc(user_id);
CREATE INDEX idx_seller_kyc_status ON seller_kyc(status);

COMMENT ON TABLE seller_kyc IS 'Stores KYC verification details for sellers';
COMMENT ON COLUMN seller_kyc.status IS 'KYC verification status: pending (default), approved (can sell), rejected (blocked)';
