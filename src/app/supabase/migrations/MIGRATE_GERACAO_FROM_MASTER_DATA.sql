-- ============================================
-- MIGRAÇÃO: Gerações de master_data para tabela geracao
-- Descrição: Remove dados de gerações da master_data
-- Data: 2026-01-21
-- ============================================

-- IMPORTANTE: Execute primeiro CREATE_GERACAO_TABLE.sql

-- 1. Verificar dados existentes antes da migração
DO $$
DECLARE
  geracao_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO geracao_count FROM public.master_data WHERE type = 'geracao';
  
  RAISE NOTICE '📊 Dados atuais em master_data:';
  RAISE NOTICE '   - Gerações (type=geracao): %', geracao_count;
END $$;

-- 2. Inserir gerações da master_data que não existem na nova tabela
INSERT INTO public.geracao (codigo, ordem)
SELECT 
  md.name as codigo,
  ROW_NUMBER() OVER (ORDER BY md.created_at) as ordem
FROM public.master_data md
WHERE md.type = 'geracao'
  AND NOT EXISTS (
    SELECT 1 FROM public.geracao g WHERE g.codigo = md.name
  )
ON CONFLICT (codigo) DO NOTHING;

-- 3. Remover dados de gerações da master_data
DELETE FROM public.master_data 
WHERE type = 'geracao';

-- 4. Verificar resultado da migração
DO $$
DECLARE
  geracao_count INTEGER;
  master_geracao_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO geracao_count FROM public.geracao;
  SELECT COUNT(*) INTO master_geracao_count FROM public.master_data WHERE type = 'geracao';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA';
  RAISE NOTICE '📊 Resultado:';
  RAISE NOTICE '   - Gerações na nova tabela: %', geracao_count;
  RAISE NOTICE '   - Gerações restantes em master_data: %', master_geracao_count;
  RAISE NOTICE '';
  
  IF master_geracao_count > 0 THEN
    RAISE WARNING '⚠️  Ainda existem dados de geracao em master_data!';
  ELSE
    RAISE NOTICE '✅ Todos os dados foram migrados com sucesso!';
  END IF;
END $$;

-- 5. Listar gerações migradas
SELECT 
  codigo,
  descricao,
  ativo,
  ordem,
  created_at
FROM public.geracao
ORDER BY ordem, codigo;
