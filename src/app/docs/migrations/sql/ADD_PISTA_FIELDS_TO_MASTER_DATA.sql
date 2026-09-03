-- ========================================
-- MIGRATION: Adicionar Campos de Pista
-- ========================================
-- 
-- DESCRIÇÃO:
-- Adiciona os campos específicos para Pista na tabela master_data:
-- - address (endereço completo da pista)
-- - coordinates (coordenadas formatadas)
-- - latitude (latitude numérica)
-- - longitude (longitude numérica)
--
-- ARQUIVO: docs/migrations/sql/ADD_PISTA_FIELDS_TO_MASTER_DATA.sql
-- DATA: 2025
-- VERSÃO: 1.0
--
-- ========================================

-- Adiciona coluna address à tabela master_data
ALTER TABLE master_data 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Adiciona coluna coordinates à tabela master_data
ALTER TABLE master_data 
ADD COLUMN IF NOT EXISTS coordinates TEXT;

-- Adiciona coluna latitude à tabela master_data
ALTER TABLE master_data 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

-- Adiciona coluna longitude à tabela master_data
ALTER TABLE master_data 
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Cria índice para otimizar buscas por tipo Pista
CREATE INDEX IF NOT EXISTS idx_master_data_pista_type 
ON master_data (type) 
WHERE type = 'pista';

-- Comentários nas colunas
COMMENT ON COLUMN master_data.address IS 'Endereço completo da pista';
COMMENT ON COLUMN master_data.coordinates IS 'Coordenadas formatadas da pista (Lat, Lng)';
COMMENT ON COLUMN master_data.latitude IS 'Latitude numérica da pista';
COMMENT ON COLUMN master_data.longitude IS 'Longitude numérica da pista';

-- ========================================
-- ✅ MIGRATION CONCLUÍDA
-- ========================================
-- 
-- As colunas foram adicionadas com sucesso!
-- Agora você pode salvar dados estendidos para Pista.
--
-- CAMPOS DISPONÍVEIS PARA PISTA:
-- - name (TEXT) - Nome da pista
-- - address (TEXT) - Endereço completo
-- - coordinates (TEXT) - Coordenadas formatadas
-- - latitude (DOUBLE PRECISION) - Latitude
-- - longitude (DOUBLE PRECISION) - Longitude
--
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION EXECUTADA COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Campos adicionados:';
  RAISE NOTICE '   - address (TEXT)';
  RAISE NOTICE '   - coordinates (TEXT)';
  RAISE NOTICE '   - latitude (DOUBLE PRECISION)';
  RAISE NOTICE '   - longitude (DOUBLE PRECISION)';
  RAISE NOTICE '🔍 Índice criado: idx_master_data_pista_type';
END $$;
