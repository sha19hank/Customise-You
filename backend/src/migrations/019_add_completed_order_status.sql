-- Migration: 019_add_completed_order_status
-- Description: Adds 'completed' to order_status enum
-- Created: 2026-01-25

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE order_status ADD VALUE 'completed';
  END IF;
END $$;
