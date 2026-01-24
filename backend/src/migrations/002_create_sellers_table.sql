-- Migration: 002_create_sellers_table
-- Description: Creates the sellers table for vendor accounts
-- Created: 2026-01-24

CREATE TYPE kyc_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
CREATE TYPE seller_status AS ENUM ('active', 'suspended', 'inactive', 'deleted', 'pending');

CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Business Info
    business_name VARCHAR(255) NOT NULL,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    business_website VARCHAR(500),
    business_description TEXT,
    business_logo_url VARCHAR(500),
    business_banner_url VARCHAR(500),
    
    -- KYC Information
    kyc_status kyc_status DEFAULT 'pending',
    kyc_verified_at TIMESTAMP,
    aadhar_number VARCHAR(12),
    pan_number VARCHAR(10),
    gst_number VARCHAR(15),
    business_registration_number VARCHAR(50),
    
    -- Bank Details
    bank_account_number VARCHAR(20),
    bank_ifsc_code VARCHAR(11),
    bank_account_holder_name VARCHAR(255),
    
    -- Location
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Rating & Performance
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    fulfillment_rate DECIMAL(5, 2) DEFAULT 100,
    response_time_hours INT DEFAULT 24,
    
    -- Commission & Fees
    commission_percentage DECIMAL(5, 2) DEFAULT 10,
    processing_fee_percentage DECIMAL(5, 2) DEFAULT 2,
    
    -- Account Status
    status seller_status DEFAULT 'pending',
    suspension_reason TEXT,
    suspension_date TIMESTAMP,
    
    -- Onboarding
    onboarding_completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sellers_user_id ON sellers(user_id);
CREATE INDEX idx_sellers_status ON sellers(status);
CREATE INDEX idx_sellers_kyc_status ON sellers(kyc_status);
CREATE INDEX idx_sellers_average_rating ON sellers(average_rating);
