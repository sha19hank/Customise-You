-- Migration: 021_add_legal_compliance_and_delivery_pricing
-- Description: Adds legal compliance, seller onboarding, and delivery pricing fields
-- Purpose: Support India-first marketplace compliance and transparency
-- Created: 2026-01-26
-- SAFETY: All fields are nullable or have safe defaults - NO BREAKING CHANGES

-- =====================================================
-- SELLERS TABLE UPDATES
-- =====================================================

-- Additional KYC/Legal fields (nullable - not all sellers require these)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS id_type VARCHAR(50) NULL,  -- e.g., 'aadhar', 'pan', 'passport', etc.
  ADD COLUMN IF NOT EXISTS gstin VARCHAR(15) NULL;    -- GST Identification Number (only if applicable)

-- Country field (default to India for existing sellers)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS seller_country VARCHAR(3) NOT NULL DEFAULT 'IN';  -- ISO 3166-1 alpha-2

-- COD acceptance flag (future-ready, but COD is NOT active yet)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS accepts_cod BOOLEAN DEFAULT false;

-- Bank account verification status (manual or future automation)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS bank_account_verified BOOLEAN DEFAULT false;

-- Seller terms acceptance timestamp
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS accepted_seller_terms_at TIMESTAMP NULL;

-- Add comment for clarity
COMMENT ON COLUMN sellers.accepts_cod IS 'Future field: COD is not supported yet. Backend will reject COD attempts.';
COMMENT ON COLUMN sellers.seller_country IS 'Seller country code (ISO 3166-1 alpha-2). Defaults to India (IN).';
COMMENT ON COLUMN sellers.accepted_seller_terms_at IS 'Timestamp when seller accepted platform terms during onboarding.';
COMMENT ON COLUMN sellers.id_type IS 'Type of ID used for KYC (e.g., aadhar, pan, passport). Optional.';
COMMENT ON COLUMN sellers.gstin IS 'GST Identification Number. Only required if seller is GST-registered.';
COMMENT ON COLUMN sellers.bank_account_verified IS 'Whether bank account details have been verified. For future payout readiness.';

-- =====================================================
-- USERS TABLE UPDATES
-- =====================================================

-- User terms acceptance timestamp
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS accepted_user_terms_at TIMESTAMP NULL;

COMMENT ON COLUMN users.accepted_user_terms_at IS 'Timestamp when user accepted platform terms during signup.';

-- =====================================================
-- PRODUCTS TABLE UPDATES
-- =====================================================

-- Delivery pricing transparency fields
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS delivery_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_price_type VARCHAR(20) NOT NULL DEFAULT 'flat';

-- Add constraint for delivery_price_type values
ALTER TABLE products
  ADD CONSTRAINT check_delivery_price_type 
  CHECK (delivery_price_type IN ('flat', 'included', 'calculated'));

COMMENT ON COLUMN products.delivery_price IS 'Delivery/shipping price for this product. 0 means free delivery.';
COMMENT ON COLUMN products.delivery_price_type IS 'Type of delivery pricing: flat (fixed), included (in base price), calculated (dynamic based on location).';

-- =====================================================
-- INDEXES FOR NEW FIELDS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sellers_seller_country ON sellers(seller_country);
CREATE INDEX IF NOT EXISTS idx_sellers_accepts_cod ON sellers(accepts_cod);
CREATE INDEX IF NOT EXISTS idx_products_delivery_price_type ON products(delivery_price_type);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- NOTE: This migration is fully backwards-compatible.
-- All existing rows remain valid with safe defaults.
-- No data loss or breaking changes.
