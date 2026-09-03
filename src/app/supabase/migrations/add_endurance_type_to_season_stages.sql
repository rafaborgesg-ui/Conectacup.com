-- =====================================================
-- Migration: Adicionar coluna 'endurance_type' à tabela season_stages
-- =====================================================
-- Descrição:
--   Adiciona a coluna 'endurance_type' na tabela 'season_stages'
--   para armazenar o tipo de corrida endurance (300km ou 500km).
--
-- Tipo: TEXT com constraint
-- Valores possíveis: 'endurance_300' ou 'endurance_500'
--
-- Autor: Sistema Conecta Cup
-- Data: 2025-01-28
-- =====================================================

-- Adicionar coluna 'endurance_type' como TEXT (opcional)
ALTER TABLE season_stages
ADD COLUMN IF NOT EXISTS endurance_type TEXT;

-- Adicionar constraint para validar apenas valores permitidos
ALTER TABLE season_stages
ADD CONSTRAINT endurance_type_check 
CHECK (endurance_type IS NULL OR endurance_type IN ('endurance_300', 'endurance_500'));

-- Adicionar comentário explicativo na coluna
COMMENT ON COLUMN season_stages.endurance_type IS 'Tipo de corrida endurance: endurance_300 (300km) ou endurance_500 (500km). NULL para outros campeonatos.';

-- =====================================================
-- Verificação da estrutura (OPCIONAL - para conferência)
-- =====================================================
-- Execute esta query para verificar se a coluna foi criada:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'season_stages' AND column_name = 'endurance_type';
