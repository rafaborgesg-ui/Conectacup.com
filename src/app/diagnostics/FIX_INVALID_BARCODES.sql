-- ============================================
-- CORREÇÃO: Registros com barcodes inválidos
-- ============================================
-- Este script corrige ou remove registros com barcodes corrompidos
-- detectados pelo script IDENTIFY_FILTERED_BARCODES.sql
--
-- ⚠️ ATENÇÃO: Este script FAZ ALTERAÇÕES NO BANCO DE DADOS
-- Execute apenas DEPOIS de revisar os resultados do diagnóstico
--
-- Execute no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
-- ============================================

-- ============================================
-- OPÇÃO 1: VISUALIZAR registros que serão afetados (SEGURO)
-- Execute esta query PRIMEIRO para revisar o que será removido
-- ============================================

SELECT 
  'PREVIEW - Registros que serão removidos' AS acao,
  COUNT(*) AS total_a_remover
FROM stock_entries
WHERE 
  -- É UUID (corrompido)
  barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR (
    -- Ou é inválido (não é numérico 7-8 dígitos E não é SEM00001)
    barcode !~ '^\d{7,8}$'
    AND barcode !~ '^[A-Z]{3}\d{5}$'
  );

-- Listar os registros (máximo 50)
SELECT 
  id,
  barcode,
  model_name,
  container_name,
  status,
  created_at,
  CASE 
    WHEN barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID corrompido'
    ELSE 'Formato inválido'
  END AS motivo
FROM stock_entries
WHERE 
  barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR (
    barcode !~ '^\d{7,8}$'
    AND barcode !~ '^[A-Z]{3}\d{5}$'
  )
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- OPÇÃO 2: REMOVER registros corrompidos (PERIGOSO - USE COM CUIDADO)
-- Descomente as linhas abaixo APENAS se você revisou a lista acima
-- e tem CERTEZA que deseja remover esses registros
-- ============================================

/*
-- Backup: Criar uma tabela temporária com os registros que serão removidos
CREATE TABLE IF NOT EXISTS stock_entries_backup_invalid_barcodes AS
SELECT * FROM stock_entries
WHERE 
  barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR (
    barcode !~ '^\d{7,8}$'
    AND barcode !~ '^[A-Z]{3}\d{5}$'
  );

-- Mostrar quantos registros foram salvos no backup
SELECT 'Backup criado' AS acao, COUNT(*) AS registros_backup 
FROM stock_entries_backup_invalid_barcodes;

-- DELETAR os registros inválidos
DELETE FROM stock_entries
WHERE 
  barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR (
    barcode !~ '^\d{7,8}$'
    AND barcode !~ '^[A-Z]{3}\d{5}$'
  );

-- Verificação final
SELECT 'Após remoção' AS status, COUNT(*) AS total_registros
FROM stock_entries;
*/

-- ============================================
-- OPÇÃO 3: TENTAR CORRIGIR barcodes corrompidos (AVANÇADO)
-- Esta opção tenta corrigir barcodes inválidos usando padrões
-- Descomente APENAS se souber o que está fazendo
-- ============================================

/*
-- Exemplo: Corrigir códigos que têm espaços ou caracteres especiais
UPDATE stock_entries
SET barcode = REGEXP_REPLACE(barcode, '[^0-9A-Z]', '', 'g')
WHERE barcode ~ '[^0-9A-Z]';

-- Verificar se as correções funcionaram
SELECT 
  'Após correção' AS status,
  COUNT(*) AS total_corrigidos
FROM stock_entries
WHERE barcode ~ '^\d{7,8}$' OR barcode ~ '^[A-Z]{3}\d{5}$';
*/

-- ============================================
-- RESTAURAR BACKUP (SE NECESSÁRIO)
-- Use isso APENAS se algo deu errado e você quer restaurar
-- ============================================

/*
-- Restaurar registros do backup
INSERT INTO stock_entries
SELECT * FROM stock_entries_backup_invalid_barcodes
ON CONFLICT (barcode) DO NOTHING;

-- Verificar restauração
SELECT 'Após restauração' AS status, COUNT(*) AS total_registros
FROM stock_entries;
*/

-- ============================================
-- LIMPEZA: Remover tabela de backup (APENAS DEPOIS DE CONFIRMAR QUE TUDO ESTÁ OK)
-- ============================================

/*
DROP TABLE IF EXISTS stock_entries_backup_invalid_barcodes;
*/
