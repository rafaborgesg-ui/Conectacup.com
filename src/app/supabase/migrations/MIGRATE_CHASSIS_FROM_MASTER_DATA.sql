-- ============================================
-- MIGRAÇÃO: Chassis de master_data para tabela chassis
-- Descrição: Remove dados de chassis da master_data
-- Data: 2026-01-21
-- ============================================

-- IMPORTANTE: Execute primeiro CREATE_CHASSIS_TABLE.sql

-- 1. Verificar dados existentes antes da migração
DO $$
DECLARE
  carro_count INTEGER;
  geracao_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO carro_count FROM public.master_data WHERE type = 'carro';
  SELECT COUNT(*) INTO geracao_count FROM public.master_data WHERE type = 'geracao';
  
  RAISE NOTICE '📊 Dados atuais em master_data:';
  RAISE NOTICE '   - Chassis (type=carro): %', carro_count;
  RAISE NOTICE '   - Gerações (type=geracao): %', geracao_count;
END $$;

-- 2. Migrar gerações para chassis existentes (se houver dados na master_data)
UPDATE public.chassis c
SET geracao = md.name
FROM public.master_data md
WHERE md.type = 'geracao'
  AND c.codigo IN (
    SELECT name FROM public.master_data WHERE type = 'carro'
  );

-- 3. Inserir chassis da master_data que não existem na nova tabela
INSERT INTO public.chassis (codigo, ordem)
SELECT 
  md.name as codigo,
  ROW_NUMBER() OVER (ORDER BY md.created_at) as ordem
FROM public.master_data md
WHERE md.type = 'carro'
  AND NOT EXISTS (
    SELECT 1 FROM public.chassis c WHERE c.codigo = md.name
  )
ON CONFLICT (codigo) DO NOTHING;

-- 4. Remover dados de chassis da master_data
DELETE FROM public.master_data 
WHERE type IN ('carro', 'geracao');

-- 5. Verificar resultado da migração
DO $$
DECLARE
  chassis_count INTEGER;
  master_carro_count INTEGER;
  master_geracao_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO chassis_count FROM public.chassis;
  SELECT COUNT(*) INTO master_carro_count FROM public.master_data WHERE type = 'carro';
  SELECT COUNT(*) INTO master_geracao_count FROM public.master_data WHERE type = 'geracao';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA';
  RAISE NOTICE '📊 Resultado:';
  RAISE NOTICE '   - Chassis na nova tabela: %', chassis_count;
  RAISE NOTICE '   - Chassis restantes em master_data: %', master_carro_count;
  RAISE NOTICE '   - Gerações restantes em master_data: %', master_geracao_count;
  RAISE NOTICE '';
  
  IF master_carro_count > 0 OR master_geracao_count > 0 THEN
    RAISE WARNING '⚠️  Ainda existem dados de chassis/geracao em master_data!';
  ELSE
    RAISE NOTICE '✅ Todos os dados foram migrados com sucesso!';
  END IF;
END $$;

-- 6. Listar chassis migrados
SELECT 
  codigo,
  geracao,
  ativo,
  ordem,
  created_at
FROM public.chassis
ORDER BY ordem, codigo;
