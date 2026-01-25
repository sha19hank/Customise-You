-- Migration: 018_add_seller_badges_and_commission_columns
-- Description: Adds seller badges and commission tracking fields
-- Created: 2026-01-25

-- Seller badges (JSONB array)
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Transaction commission tracking
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_earning_amount DECIMAL(10, 2) DEFAULT 0;

-- Backfill existing rows (if any)
UPDATE transactions
SET gross_amount = COALESCE(gross_amount, amount),
    platform_fee_amount = COALESCE(platform_fee_amount, platform_fee),
    seller_earning_amount = COALESCE(seller_earning_amount, net_amount)
WHERE gross_amount = 0 AND amount IS NOT NULL;
