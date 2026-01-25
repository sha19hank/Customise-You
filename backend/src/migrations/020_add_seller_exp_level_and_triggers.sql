-- Migration: 020_add_seller_exp_level_and_triggers
-- Description: Adds seller EXP/level and triggers for automatic updates
-- Created: 2026-01-25

-- Seller EXP + level columns
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Helper: compute seller level from EXP (deterministic)
CREATE OR REPLACE FUNCTION calculate_seller_level(exp_points INTEGER)
RETURNS INTEGER AS $$
DECLARE
  lvl INTEGER;
BEGIN
  IF exp_points >= 10000 THEN lvl := 10;
  ELSIF exp_points >= 6000 THEN lvl := 9;
  ELSIF exp_points >= 3500 THEN lvl := 8;
  ELSIF exp_points >= 2000 THEN lvl := 7;
  ELSIF exp_points >= 1200 THEN lvl := 6;
  ELSIF exp_points >= 700 THEN lvl := 5;
  ELSIF exp_points >= 350 THEN lvl := 4;
  ELSIF exp_points >= 150 THEN lvl := 3;
  ELSIF exp_points >= 50 THEN lvl := 2;
  ELSE lvl := 1;
  END IF;

  RETURN lvl;
END;
$$ LANGUAGE plpgsql;

-- Helper: apply EXP delta transactionally (clamped at 0)
CREATE OR REPLACE FUNCTION apply_seller_exp(p_seller_id UUID, p_delta INTEGER)
RETURNS VOID AS $$
DECLARE
  current_exp INTEGER;
  new_exp INTEGER;
  new_level INTEGER;
BEGIN
  SELECT experience_points INTO current_exp FROM sellers WHERE id = p_seller_id FOR UPDATE;
  current_exp := COALESCE(current_exp, 0);

  new_exp := GREATEST(0, current_exp + p_delta);
  new_level := calculate_seller_level(new_exp);

  UPDATE sellers
  SET experience_points = new_exp,
      level = new_level
  WHERE id = p_seller_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: order status to completed => +10 EXP
CREATE OR REPLACE FUNCTION trg_orders_completed_exp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM apply_seller_exp(NEW.seller_id, 10);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_completed_exp ON orders;
CREATE TRIGGER orders_completed_exp
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION trg_orders_completed_exp();

-- Trigger: review creation => EXP based on rating
CREATE OR REPLACE FUNCTION trg_reviews_exp()
RETURNS TRIGGER AS $$
DECLARE
  delta INTEGER;
BEGIN
  delta := 0;
  IF NEW.rating = 5 THEN
    delta := 5;
  ELSIF NEW.rating = 4 THEN
    delta := 3;
  END IF;

  IF delta <> 0 THEN
    PERFORM apply_seller_exp(
      (SELECT seller_id FROM products WHERE id = NEW.product_id),
      delta
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_exp ON reviews;
CREATE TRIGGER reviews_exp
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION trg_reviews_exp();
