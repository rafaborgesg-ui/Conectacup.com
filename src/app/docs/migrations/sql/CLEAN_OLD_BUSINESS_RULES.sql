-- =====================================================
-- MIGRATION: CLEAN OLD BUSINESS RULES
-- Remove regras antigas que não correspondem aos dados atuais
-- =====================================================
-- 
-- OBJETIVO:
-- Limpar todas as regras existentes para permitir que o sistema
-- regenere automaticamente com base nos dados atuais de
-- categorias e campeonatos cadastrados no Master Data
--
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
-- =====================================================

-- =====================================================
-- 1. VERIFICAR REGRAS EXISTENTES (ANTES)
-- =====================================================

SELECT 
  rule_type,
  categoria,
  campeonato,
  quantidade
FROM business_rules
ORDER BY rule_type, categoria, campeonato;

-- =====================================================
-- 2. DELETAR TODAS AS REGRAS ANTIGAS
-- =====================================================

-- CUIDADO: Isso remove TODAS as regras!
-- O sistema irá regenerá-las automaticamente na próxima vez
-- que você acessar a aba "Regras" no Master Data

DELETE FROM business_rules;

-- =====================================================
-- 3. VERIFICAR QUE A TABELA ESTÁ VAZIA (DEPOIS)
-- =====================================================

SELECT COUNT(*) as total_regras FROM business_rules;
-- Deve retornar: 0

-- =====================================================
-- ✅ LIMPEZA COMPLETA
-- =====================================================

-- Próximos passos:
-- 1. Recarregue a página do sistema
-- 2. Vá para Master Data > Regras
-- 3. Clique no botão "Regenerar Regras"
-- 4. As regras serão geradas automaticamente com TODOS os campeonatos
--    cadastrados, incluindo "Endurance 300km" e "Endurance 500km"
-- 5. Edite as quantidades conforme necessário
-- 6. Clique em "Salvar Regras"
--
-- =====================================================
