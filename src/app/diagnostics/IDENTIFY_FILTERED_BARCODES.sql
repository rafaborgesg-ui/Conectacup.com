-- ============================================
-- DIAGNÓSTICO: Identificar códigos de barras filtrados
-- ============================================
-- Este script identifica registros que estão sendo filtrados
-- pela validação de barcode na função getStockEntries()
--
-- Execute no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
-- ============================================

-- 1. Total de registros no banco
SELECT 
  'Total de registros no banco' AS verificacao,
  COUNT(*) AS total
FROM stock_entries;

-- 2. Registros com barcode UUID (corrompidos)
SELECT 
  'Registros com barcode UUID (corrompidos)' AS verificacao,
  COUNT(*) AS total
FROM stock_entries
WHERE barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Listar os registros UUID corrompidos (máximo 100)
SELECT 
  id,
  barcode,
  model_name,
  container_name,
  status,
  created_at
FROM stock_entries
WHERE barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY created_at DESC
LIMIT 100;

-- 4. Registros com barcode que NÃO são numéricos 7-8 dígitos NEM alfanuméricos SEM00001
SELECT 
  'Registros com barcode inválido (não numérico e não SEM00001)' AS verificacao,
  COUNT(*) AS total
FROM stock_entries
WHERE 
  -- NÃO é UUID
  barcode !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  -- NÃO é 7-8 dígitos numéricos
  AND barcode !~ '^\d{7,8}$'
  -- NÃO é formato SEM00001
  AND barcode !~ '^[A-Z]{3}\d{5}$';

-- 5. Listar os registros com barcode inválido (máximo 100)
SELECT 
  id,
  barcode,
  LENGTH(barcode) AS tamanho_barcode,
  model_name,
  container_name,
  status,
  created_at
FROM stock_entries
WHERE 
  -- NÃO é UUID
  barcode !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  -- NÃO é 7-8 dígitos numéricos
  AND barcode !~ '^\d{7,8}$'
  -- NÃO é formato SEM00001
  AND barcode !~ '^[A-Z]{3}\d{5}$'
ORDER BY created_at DESC
LIMIT 100;

-- 6. Registros VÁLIDOS (deveriam aparecer na interface)
SELECT 
  'Registros VÁLIDOS (devem aparecer)' AS verificacao,
  COUNT(*) AS total
FROM stock_entries
WHERE 
  -- NÃO é UUID
  barcode !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    -- É 7-8 dígitos numéricos
    barcode ~ '^\d{7,8}$'
    -- OU é formato SEM00001
    OR barcode ~ '^[A-Z]{3}\d{5}$'
  );

-- 7. Análise de padrões de barcode
SELECT 
  CASE 
    WHEN barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID (corrompido)'
    WHEN barcode ~ '^\d{8}$' THEN '8 dígitos numéricos'
    WHEN barcode ~ '^\d{7}$' THEN '7 dígitos numéricos'
    WHEN barcode ~ '^[A-Z]{3}\d{5}$' THEN 'Alfanumérico SEM00001'
    ELSE 'Formato desconhecido'
  END AS tipo_barcode,
  COUNT(*) AS quantidade,
  STRING_AGG(DISTINCT SUBSTRING(barcode, 1, 10), ', ') AS exemplos
FROM stock_entries
GROUP BY 1
ORDER BY 2 DESC;

-- 8. Resumo final
SELECT 
  'RESUMO FINAL' AS titulo,
  (SELECT COUNT(*) FROM stock_entries) AS total_banco,
  (SELECT COUNT(*) FROM stock_entries WHERE barcode ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS total_uuid_corrompidos,
  (SELECT COUNT(*) FROM stock_entries WHERE barcode !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND barcode !~ '^\d{7,8}$' AND barcode !~ '^[A-Z]{3}\d{5}$') AS total_invalidos,
  (SELECT COUNT(*) FROM stock_entries WHERE barcode !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND (barcode ~ '^\d{7,8}$' OR barcode ~ '^[A-Z]{3}\d{5}$')) AS total_validos;

-- ============================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- ============================================
-- 
-- Se total_banco = 13.239 e total_validos = 12.952:
--   -> total_uuid_corrompidos + total_invalidos = 287 registros filtrados
--
-- PRÓXIMO PASSO:
-- Execute o script FIX_INVALID_BARCODES.sql para corrigir ou remover
-- os registros corrompidos/inválidos identificados acima.
-- ============================================
