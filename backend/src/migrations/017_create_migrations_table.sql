-- Migration: 017_create_migrations_table
-- Description: Creates the migrations table for tracking migration history
-- Created: 2026-01-24
-- Note: This migration ensures the table exists (though it's usually auto-created)

CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index (with IF NOT EXISTS check)
CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
