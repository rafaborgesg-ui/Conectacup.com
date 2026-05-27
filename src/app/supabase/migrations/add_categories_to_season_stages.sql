-- =====================================================
-- Migration: Adicionar coluna 'categories' à tabela season_stages
-- =====================================================
-- Descrição:
--   Adiciona a coluna 'categories' na tabela 'season_stages'
--   para armazenar quais categorias participam de cada etapa.
--
-- Tipo: JSONB (array de strings)
-- Exemplo: ["Carrera", "Challenge", "Trophy"]
--
-- Autor: Sistema Conecta Cup
-- Data: 2025-01-28
-- =====================================================

-- Adicionar coluna 'categories' como JSONB (array de strings)
ALTER TABLE season_stages
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;

-- Adicionar comentário explicativo na coluna
COMMENT ON COLUMN season_stages.categories IS 'Array de categorias que participam desta etapa (ex: ["Carrera", "Challenge"])';

-- Criar índice para melhorar performance em consultas que filtram por categoria
CREATE INDEX IF NOT EXISTS idx_season_stages_categories 
ON season_stages USING GIN (categories);

-- =====================================================
-- Verificação da estrutura (OPCIONAL - para conferência)
-- =====================================================
-- Execute esta query para verificar se a coluna foi criada:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'season_stages' AND column_name = 'categories';
