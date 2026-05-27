-- =====================================================
-- MIGRATION: FIX BUSINESS RULES CONSTRAINTS
-- Remove constraints fixos para aceitar valores dinâmicos
-- =====================================================
-- 
-- OBJETIVO:
-- Remover as constraints CHECK que limitam os valores de
-- categoria e campeonato para valores fixos, permitindo
-- que aceitem quaisquer valores cadastrados na master_data
--
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
-- =====================================================

-- =====================================================
-- 1. REMOVER CONSTRAINTS FIXAS
-- =====================================================

-- Remove constraint de categoria
ALTER TABLE business_rules 
DROP CONSTRAINT IF EXISTS business_rules_categoria_check;

-- Remove constraint de campeonato  
ALTER TABLE business_rules 
DROP CONSTRAINT IF EXISTS business_rules_campeonato_check;

-- =====================================================
-- 2. ADICIONAR CONSTRAINTS BÁSICAS (apenas NOT NULL)
-- =====================================================

-- Garante que categoria não pode ser vazia
ALTER TABLE business_rules 
ADD CONSTRAINT business_rules_categoria_not_empty 
CHECK (LENGTH(TRIM(categoria)) > 0);

-- Garante que campeonato não pode ser vazio
ALTER TABLE business_rules 
ADD CONSTRAINT business_rules_campeonato_not_empty 
CHECK (LENGTH(TRIM(campeonato)) > 0);

-- =====================================================
-- 3. ATUALIZAR COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN business_rules.categoria IS 'Categoria do piloto (ex: Carrera, Challenge, Trophy) - valores cadastrados dinamicamente';
COMMENT ON COLUMN business_rules.campeonato IS 'Tipo de campeonato (ex: Sprint, Endurance, Endurance 300km, Endurance 500km) - valores cadastrados dinamicamente';

-- =====================================================
-- 4. VALIDAÇÃO
-- =====================================================

-- Verifica a estrutura da tabela
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'business_rules'
ORDER BY constraint_type, constraint_name;

-- Verifica todas as regras existentes
SELECT 
  rule_type,
  categoria,
  campeonato,
  quantidade
FROM business_rules
ORDER BY rule_type, categoria, campeonato;

-- =====================================================
-- ✅ MIGRATION COMPLETA
-- =====================================================

-- Agora a tabela business_rules aceita:
-- - Qualquer categoria cadastrada na master_data
-- - Qualquer campeonato cadastrado na master_data
-- 
-- Desde que:
-- - Não sejam valores vazios
-- - Respeitem a constraint de unicidade (rule_type, categoria, campeonato)
--
-- =====================================================
