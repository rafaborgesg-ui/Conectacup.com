-- 🔍 SCRIPT DE VERIFICAÇÃO E CONFIGURAÇÃO DE REALTIME
-- Execute este script no SQL Editor do Supabase Dashboard

-- ========================================
-- PASSO 1: Verificar se a tabela existe
-- ========================================
SELECT 
  table_schema,
  table_name,
  table_type
FROM 
  information_schema.tables
WHERE 
  table_name = 'conference_sessions';

-- Resultado esperado: 1 linha mostrando a tabela
-- Se retornar 0 linhas, a tabela não existe!


-- ========================================
-- PASSO 2: Configurar REPLICA IDENTITY
-- ========================================
ALTER TABLE public.conference_sessions REPLICA IDENTITY FULL;

-- Isso garante que o Realtime pode rastrear mudanças em TODOS os campos


-- ========================================
-- PASSO 3: Adicionar tabela à publicação Realtime
-- ========================================
DO $$
BEGIN
  -- Tenta adicionar a tabela
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_sessions;
  
  RAISE NOTICE '✅ Tabela conference_sessions adicionada ao Realtime com sucesso!';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ Tabela já estava no Realtime (já configurado anteriormente)';
  WHEN undefined_object THEN
    RAISE EXCEPTION '❌ Publicação supabase_realtime não existe! Realtime pode não estar habilitado neste projeto.';
END $$;


-- ========================================
-- PASSO 4: Verificar publicação
-- ========================================
SELECT 
  schemaname,
  tablename,
  pubname
FROM 
  pg_publication_tables
WHERE 
  pubname = 'supabase_realtime'
  AND tablename = 'conference_sessions';

-- Resultado esperado: 1 linha mostrando:
-- schemaname | tablename           | pubname
-- -----------+---------------------+-----------------
-- public     | conference_sessions | supabase_realtime
--
-- Se retornar 0 linhas, o Realtime NÃO está configurado!


-- ========================================
-- PASSO 5: Verificar RLS (Row Level Security)
-- ========================================
SELECT 
  tablename,
  rowsecurity
FROM 
  pg_tables
WHERE 
  tablename = 'conference_sessions';

-- Se rowsecurity = true, verifique as políticas:


-- ========================================
-- PASSO 6: Listar políticas RLS
-- ========================================
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM 
  pg_policies
WHERE 
  tablename = 'conference_sessions';

-- Certifique-se de que há políticas permitindo SELECT para usuários autenticados


-- ========================================
-- PASSO 7: Teste manual de UPDATE
-- ========================================
-- Buscar a sessão ativa atual
SELECT id, season_name, updated_at 
FROM conference_sessions 
WHERE is_active = true 
LIMIT 1;

-- COPIE O ID DA SESSÃO ATIVA e execute:
-- (Substitua 'SEU-ID-AQUI' pelo ID copiado)

UPDATE conference_sessions
SET updated_at = NOW()
WHERE id = 'SEU-ID-AQUI';

-- Se você estiver com a página aberta em outro navegador,
-- você DEVE ver logs no console dizendo "UPDATE RECEBIDO EM TEMPO REAL!"


-- ========================================
-- PASSO 8: Verificar configuração do projeto
-- ========================================
SELECT 
  name,
  setting
FROM 
  pg_settings
WHERE 
  name IN ('wal_level', 'max_replication_slots', 'max_wal_senders');

-- Resultado esperado:
-- wal_level deve ser 'logical' ou 'replica'
-- max_replication_slots deve ser > 0
-- max_wal_senders deve ser > 0


-- ========================================
-- 🔥 DIAGNÓSTICO COMPLETO
-- ========================================
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_in_publication BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_has_policies BOOLEAN;
BEGIN
  -- Verifica se a tabela existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'conference_sessions'
  ) INTO v_table_exists;
  
  -- Verifica se está na publicação
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conference_sessions'
  ) INTO v_in_publication;
  
  -- Verifica RLS
  SELECT rowsecurity 
  FROM pg_tables 
  WHERE tablename = 'conference_sessions'
  INTO v_rls_enabled;
  
  -- Verifica políticas
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'conference_sessions'
  ) INTO v_has_policies;
  
  -- Relatório
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNÓSTICO DE REALTIME';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. Tabela existe: %', CASE WHEN v_table_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '2. Na publicação Realtime: %', CASE WHEN v_in_publication THEN '✅ SIM' ELSE '❌ NÃO - EXECUTAR PASSO 3!' END;
  RAISE NOTICE '3. RLS habilitado: %', CASE WHEN v_rls_enabled THEN '✅ SIM' ELSE '⚠️ NÃO' END;
  RAISE NOTICE '4. Possui políticas: %', CASE WHEN v_has_policies THEN '✅ SIM' ELSE '⚠️ NÃO' END;
  RAISE NOTICE '========================================';
  
  IF NOT v_in_publication THEN
    RAISE EXCEPTION '❌ REALTIME NÃO CONFIGURADO! Execute o PASSO 3 acima.';
  END IF;
  
  IF v_rls_enabled AND NOT v_has_policies THEN
    RAISE WARNING '⚠️ RLS está habilitado mas não há políticas! Usuários podem não conseguir acessar os dados.';
  END IF;
  
  RAISE NOTICE '✅ Configuração parece correta!';
END $$;