-- =====================================================
-- SCRIPT DE VERIFICAÇÃO - TABELAS PROTHEUS
-- =====================================================
-- Execute este SQL para verificar se as tabelas estão
-- com a estrutura correta
-- =====================================================

-- 1. VERIFICAR ESTRUTURA DAS TABELAS
SELECT 
  'SETOR' as tabela,
  column_name as coluna,
  data_type as tipo,
  is_nullable as nulo
FROM information_schema.columns
WHERE table_name = 'setor'
  AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

SELECT 
  'PROJETO' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projeto'
  AND table_schema = 'public'
ORDER BY ordinal_position

UNION ALL

SELECT 
  'CONTA_CONTABIL' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conta_contabil'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================

-- 2. VERIFICAR QUANTIDADE DE REGISTROS
SELECT 
  'setor' as tabela,
  COUNT(*) as total_registros
FROM setor

UNION ALL

SELECT 
  'projeto' as tabela,
  COUNT(*) as total_registros
FROM projeto

UNION ALL

SELECT 
  'conta_contabil' as tabela,
  COUNT(*) as total_registros
FROM conta_contabil;

-- =====================================================

-- 3. EXEMPLO DE DADOS DE CADA TABELA

-- SETOR
SELECT 
  'SETOR' as tipo,
  setor as nome,
  SUBSTRING(descricao, 1, 30) as descricao_resumo,
  responsavel
FROM setor
LIMIT 3;

-- PROJETO  
SELECT 
  'PROJETO' as tipo,
  projeto as nome,
  SUBSTRING(descricao, 1, 30) as descricao_resumo,
  temporada::text as info_extra
FROM projeto
LIMIT 3;

-- CONTA CONTÁBIL
SELECT 
  'CONTA_CONTABIL' as tipo,
  "Conta Contábil" as nome,
  SUBSTRING(descricao, 1, 30) as descricao_resumo,
  '' as info_extra
FROM conta_contabil
LIMIT 3;

-- =====================================================

-- 4. VERIFICAR SE TODAS AS COLUNAS NECESSÁRIAS EXISTEM

DO $$ 
DECLARE
  missing_columns TEXT := '';
BEGIN
  -- Verificar SETOR
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'setor' AND column_name = 'setor'
  ) THEN
    missing_columns := missing_columns || 'setor.setor, ';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'setor' AND column_name = 'descricao'
  ) THEN
    missing_columns := missing_columns || 'setor.descricao, ';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'setor' AND column_name = 'responsavel'
  ) THEN
    missing_columns := missing_columns || 'setor.responsavel, ';
  END IF;
  
  -- Verificar PROJETO
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projeto' AND column_name = 'projeto'
  ) THEN
    missing_columns := missing_columns || 'projeto.projeto, ';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projeto' AND column_name = 'descricao'
  ) THEN
    missing_columns := missing_columns || 'projeto.descricao, ';
  END IF;
  
  -- Verificar CONTA_CONTABIL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conta_contabil' AND column_name = 'Conta Contábil'
  ) THEN
    missing_columns := missing_columns || 'conta_contabil."Conta Contábil", ';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conta_contabil' AND column_name = 'descricao'
  ) THEN
    missing_columns := missing_columns || 'conta_contabil.descricao, ';
  END IF;
  
  -- Resultado
  IF missing_columns = '' THEN
    RAISE NOTICE '✅ TODAS AS COLUNAS NECESSÁRIAS EXISTEM!';
  ELSE
    RAISE WARNING '⚠️ COLUNAS FALTANDO: %', missing_columns;
  END IF;
END $$;

-- =====================================================

-- RESULTADO ESPERADO:
-- ✅ TODAS AS COLUNAS NECESSÁRIAS EXISTEM!
-- 
-- Total de registros:
-- - setor: 28
-- - projeto: 18
-- - conta_contabil: 147
-- =====================================================
