-- Migration: Add user fields to order_conferences table
-- Created: 2026-04-29
-- Description: Adds fields to track who performed the conference

-- Add user tracking columns
ALTER TABLE order_conferences
ADD COLUMN IF NOT EXISTS performed_by_id UUID,
ADD COLUMN IF NOT EXISTS performed_by_name TEXT;

-- Add foreign key to user_profiles (if exists)
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
--     ALTER TABLE order_conferences
--     ADD CONSTRAINT fk_performed_by_user
--     FOREIGN KEY (performed_by_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
--   END IF;
-- END $$;

-- Add comments
COMMENT ON COLUMN order_conferences.performed_by_id IS 'ID do usuário que realizou a conferência';
COMMENT ON COLUMN order_conferences.performed_by_name IS 'Nome do usuário que realizou a conferência';

-- Create index for queries by user
CREATE INDEX IF NOT EXISTS idx_order_conferences_performed_by ON order_conferences(performed_by_id);
