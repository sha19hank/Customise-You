-- Migration: 021_add_razorpay_order_id_column
-- Description: Adds razorpay_order_id column to orders table and updates payment_status enum
-- Created: 2026-01-27

-- Add razorpay_order_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);

-- Create index for razorpay_order_id
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);

-- Add 'paid' to payment_status enum if it doesn't exist
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'paid';

-- Add 'expired' to order_status enum if it doesn't exist
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'expired';
