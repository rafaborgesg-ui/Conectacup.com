-- ============================================
-- LIMPEZA: Tabelas do Protheus
-- ============================================
-- 
-- 🧹 Use este SQL se você tiver problemas para importar os dados.
-- 
-- Ele remove COMPLETAMENTE as 3 tabelas: setor, projeto, conta_contabil
-- Depois execute o SQL principal: protheus_tables.sql
-- 
-- ⚠️ ATENÇÃO: Isto APAGA TODOS OS DADOS das 3 tabelas!
-- ============================================

DROP TABLE IF EXISTS public.setor CASCADE;
DROP TABLE IF EXISTS public.projeto CASCADE;
DROP TABLE IF EXISTS public.conta_contabil CASCADE;

-- Pronto! Agora execute: protheus_tables.sql
