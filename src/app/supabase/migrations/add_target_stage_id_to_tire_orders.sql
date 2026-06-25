-- Migration: Add target_stage_id to tire_orders
-- This permanently links each order to its delivery stage,
-- allowing multiple orders per stage without depending on demand_calculations.
-- Execute in Supabase SQL Editor.

ALTER TABLE tire_orders
  ADD COLUMN IF NOT EXISTS target_stage_id UUID REFERENCES season_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tire_orders_target_stage ON tire_orders(target_stage_id);
