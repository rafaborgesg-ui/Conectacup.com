-- Migration: Add sector field to containers table
-- Created: 2026-04-29
-- Description: Adds optional sector field to containers for better organization

-- Add sector column to containers table
ALTER TABLE containers
ADD COLUMN IF NOT EXISTS sector TEXT;

-- Add comment to the column
COMMENT ON COLUMN containers.sector IS 'Setor ou área onde o contêiner está localizado';

-- Optional: Create index if you plan to filter by sector frequently
-- CREATE INDEX IF NOT EXISTS idx_containers_sector ON containers(sector);

-- Test query to verify
-- SELECT id, name, location, sector FROM containers LIMIT 5;
