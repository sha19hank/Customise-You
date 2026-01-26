-- Migration: 022_update_address_type_enum
-- Description: Updates address_type enum to use Home/Work/Other instead of shipping/billing/both
-- Created: 2026-01-26

-- Step 1: Drop default first
ALTER TABLE addresses ALTER COLUMN type DROP DEFAULT;

-- Step 2: Convert column to text temporarily
ALTER TABLE addresses ALTER COLUMN type TYPE TEXT;

-- Step 3: Update existing data to new values
UPDATE addresses SET type = 'Home' WHERE type = 'shipping';
UPDATE addresses SET type = 'Work' WHERE type = 'billing';
UPDATE addresses SET type = 'Other' WHERE type = 'both';

-- Step 4: Drop old enum type (CASCADE to remove dependencies)
DROP TYPE IF EXISTS address_type CASCADE;

-- Step 5: Create new enum with correct values
CREATE TYPE address_type AS ENUM ('Home', 'Work', 'Other');

-- Step 6: Convert column back to enum type
ALTER TABLE addresses ALTER COLUMN type TYPE address_type USING type::address_type;
ALTER TABLE addresses ALTER COLUMN type SET DEFAULT 'Home';

COMMENT ON COLUMN addresses.type IS 'Address type: Home, Work, or Other';
