-- 🔥 CONFIGURAÇÃO SIMPLES DE REALTIME
-- Execute este script no SQL Editor do Supabase Dashboard

-- ========================================
-- PASSO 1: Configurar REPLICA IDENTITY
-- ========================================
ALTER TABLE public.conference_sessions REPLICA IDENTITY FULL;

-- ========================================
-- PASSO 2: Adicionar à publicação Realtime
-- ========================================
-- Primeiro, tenta remover (ignora erro se não existir)
ALTER PUBLICATION supabase_realtime DROP TABLE public.conference_sessions;

-- Agora adiciona
ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_sessions;

-- ========================================
-- ✅ PRONTO! Agora verifique:
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

-- Resultado esperado: 1 linha mostrando a tabela
-- Se retornar 1 linha, está CONFIGURADO! ✅
