-- ========================================
-- MIGRATION: Add Protheus Fields to Master Data
-- Versão: 1.0
-- Data: 27/11/2024
-- ========================================
-- 
-- DESCRIÇÃO:
-- Adiciona campos para suportar a seção Protheus no Master Data:
-- - description: Descrição (para todos os tipos Protheus)
-- - responsavel: Responsável (apenas para Setor)
--
-- TIPOS PROTHEUS:
-- 1. setor - Setor + Descrição + Responsável
-- 2. projeto - Projeto + Descrição
-- 3. conta_contabil - Conta Contábil + Descrição
--
-- ========================================

-- Adiciona coluna description à tabela master_data
ALTER TABLE master_data 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Adiciona coluna responsavel à tabela master_data
ALTER TABLE master_data 
ADD COLUMN IF NOT EXISTS responsavel TEXT;

-- Cria índice para otimizar buscas por tipo Protheus
CREATE INDEX IF NOT EXISTS idx_master_data_protheus_types 
ON master_data (type) 
WHERE type IN ('setor', 'projeto', 'conta_contabil');

-- Comentários nas colunas
COMMENT ON COLUMN master_data.description IS 'Descrição do item (usado em Protheus: setor, projeto, conta_contabil)';
COMMENT ON COLUMN master_data.responsavel IS 'Responsável pelo item (usado em Protheus: apenas setor)';

-- ========================================
-- ✅ MIGRATION CONCLUÍDA
-- ========================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Execute esta migration no Supabase SQL Editor
-- 2. Acesse Master Data > Protheus no sistema
-- 3. Cadastre Setores, Projetos e Contas Contábeis
--
-- CAMPOS DISPONÍVEIS:
-- - Setor: Nome + Descrição + Responsável
-- - Projeto: Nome + Descrição  
-- - Conta Contábil: Nome + Descrição
--
-- ========================================

-- LOG de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída: Campos Protheus adicionados ao Master Data';
  RAISE NOTICE '📋 Campos adicionados:';
  RAISE NOTICE '   - description (TEXT)';
  RAISE NOTICE '   - responsavel (TEXT)';
  RAISE NOTICE '🔍 Índice criado: idx_master_data_protheus_types';
END $$;
